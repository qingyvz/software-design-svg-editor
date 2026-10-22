import { DOMImplementation, DOMParser, XMLSerializer } from '@xmldom/xmldom';
import type { Document as XmlDocument, Element } from '@xmldom/xmldom';
import { SvgDocument } from '../domain/SvgDocument.js';
import { ShapeFactory } from '../domain/ShapeFactory.js';
import { Shape } from '../domain/Shape.js';
import { Numbers } from '../domain/Numbers.js';
import { AffineTransform } from '../domain/AffineTransform.js';
import type { LoadedDocument } from '../application/DocumentPort.js';
import { SvgTransform } from './SvgTransform.js';

interface ImportState {
  reserved: Set<string>;
  counters: Map<string, number>;
  warnings: string[];
}

export class SvgCodec {
  private readonly namespace = 'http://www.w3.org/2000/svg';
  constructor(private readonly factory = new ShapeFactory()) {}

  decode(source: string): LoadedDocument {
    if (/<!DOCTYPE|<!ENTITY/i.test(source)) throw new Error('DOCTYPE and entities are not supported');
    const parsed = new DOMParser({ onError: (_level, message) => { throw new Error(message); } }).parseFromString(source, 'application/xml');
    const root = parsed.documentElement;
    if (!root || root.localName !== 'svg' || (root.namespaceURI && root.namespaceURI !== this.namespace)) throw new Error('root element must be svg');
    const rootAllowed = new Set(['xmlns', 'width', 'height', 'viewBox', 'version', 'id']);
    for (let i = 0; i < root.attributes.length; i++) {
      const name = root.attributes.item(i)!.name;
      if (!rootAllowed.has(name) && !name.startsWith('xmlns:')) throw new Error(`unsupported SVG root attribute: ${name}`);
    }
    const viewport = root.getAttribute('viewBox')?.trim().split(/[\s,]+/).map(n => Numbers.parse(n, 'viewBox'));
    const width = this.length(root.getAttribute('width') ?? (viewport ? String(viewport[2]) : '800'), 'width');
    const height = this.length(root.getAttribute('height') ?? (viewport ? String(viewport[3]) : '600'), 'height');
    const document = new SvgDocument(width, height, viewport);
    const state: ImportState = { reserved: new Set(), counters: new Map(), warnings: [] };
    const all = root.getElementsByTagName('*');
    if (all.length > 20000) throw new Error('SVG exceeds 20000 elements');
    for (let i = 0; i < all.length; i++) {
      const id = all.item(i)!.getAttribute('id');
      if (!id) continue;
      if (state.reserved.has(id)) throw new Error(`id already exists: ${id}`);
      state.reserved.add(id);
    }
    this.assertContainerText(root);
    for (const child of this.elements(root)) document.add(this.importElement(child, new Map(), AffineTransform.identity(), 1, state));
    document.assertValid();
    return { document, warnings: state.warnings };
  }

  private importElement(element: Element, inherited: ReadonlyMap<string, string>, outer: AffineTransform, depth: number, state: ImportState): Shape {
    if (depth > 256) throw new Error('SVG nesting exceeds 256 levels');
    if (element.namespaceURI && element.namespaceURI !== this.namespace) throw new Error('unsupported element namespace');
    const tag = element.localName ?? element.tagName;
    const id = element.getAttribute('id') || this.assignId(tag, state);
    const attributes = new Map<string, string>();
    for (let i = 0; i < element.attributes.length; i++) {
      const attribute = element.attributes.item(i)!;
      if (!attribute.name.startsWith('xmlns:')) attributes.set(attribute.name, attribute.value);
    }
    const transform = outer.multiply(SvgTransform.parse(attributes.get('transform') ?? ''));
    const lengths = new Map(inherited);
    for (const key of ['font-size', 'stroke-width']) if (attributes.has(key)) lengths.set(key, attributes.get(key)!);
    const children = this.elements(element).map(child => this.importElement(child, lengths, transform, depth + 1, state));
    const shape = this.factory.fromSvg(tag, id, attributes, element.textContent ?? '', children);
    if (shape.container) this.assertContainerText(element);
    else {
      if (children.length) throw new Error(`child elements not supported in <${tag}>`);
      if (shape.text === null && element.textContent?.trim()) throw new Error(`unexpected text in <${tag}>`);
      this.importTransform(shape, transform, lengths);
    }
    return shape;
  }

  private importTransform(shape: Shape, transform: AffineTransform, lengths: ReadonlyMap<string, string>): void {
    const scale = transform.positiveUniformScale;
    if (scale === undefined) {
      shape.applyTransform(transform);
      return;
    }
    // 平移和正等比缩放仍写入几何属性，保持原有 CLI 坐标表示。
    shape.scale(scale);
    shape.move(transform.e, transform.f);
    if (scale !== 1) {
      shape.importPresentation('stroke-width', String(this.length(lengths.get('stroke-width') ?? '1', 'stroke-width') * scale));
      if (shape.text !== null) {
        shape.importPresentation('font-size', String(Numbers.finite(this.length(lengths.get('font-size') ?? '16', 'font-size') * scale, 'font-size')));
      }
    }
  }

  private assignId(tag: string, state: ImportState): string {
    let serial = state.counters.get(tag) ?? 0;
    let id: string;
    do { id = tag + ++serial; } while (state.reserved.has(id));
    state.counters.set(tag, serial);
    state.reserved.add(id);
    state.warnings.push(`warning: assigned id ${id} to unnamed <${tag}>`);
    return id;
  }

  private elements(parent: Element): Element[] {
    const children: Element[] = [];
    for (let i = 0; i < parent.childNodes.length; i++) {
      const child = parent.childNodes.item(i)!;
      if (child.nodeType === child.ELEMENT_NODE) children.push(child as Element);
    }
    return children;
  }

  private assertContainerText(element: Element): void {
    for (let i = 0; i < element.childNodes.length; i++) {
      const child = element.childNodes.item(i)!;
      if ((child.nodeType === child.TEXT_NODE || child.nodeType === child.CDATA_SECTION_NODE) && child.nodeValue?.trim()) throw new Error('unexpected text in container');
    }
  }

  private length(value: string, name: string): number { return Numbers.parse(value.trim().replace(/px$/, ''), name); }

  encode(document: SvgDocument): string {
    document.assertValid();
    const xml = new DOMImplementation().createDocument(this.namespace, 'svg', null);
    const root = xml.documentElement!;
    root.setAttribute('width', String(document.width));
    root.setAttribute('height', String(document.height));
    root.setAttribute('viewBox', document.viewBox.join(' '));
    for (const shape of document.children) {
      root.appendChild(xml.createTextNode('\n  '));
      root.appendChild(this.element(xml, shape, '  '));
    }
    if (document.count) root.appendChild(xml.createTextNode('\n'));
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(xml) + '\n';
  }

  private element(xml: XmlDocument, shape: Shape, indent: string): Element {
    const element = xml.createElementNS(this.namespace, shape.tag);
    element.setAttribute('id', shape.id);
    for (const [name, value] of shape.attributes) element.setAttribute(name, value);
    if (shape.text !== null) element.appendChild(xml.createTextNode(shape.text));
    for (const child of shape.children) {
      element.appendChild(xml.createTextNode('\n' + indent + '  '));
      element.appendChild(this.element(xml, child, indent + '  '));
    }
    if (shape.children.length) element.appendChild(xml.createTextNode('\n' + indent));
    return element;
  }
}
