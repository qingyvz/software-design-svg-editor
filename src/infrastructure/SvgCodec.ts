import { DOMImplementation, DOMParser, XMLSerializer } from '@xmldom/xmldom';
import type { Document as XmlDocument, Element } from '@xmldom/xmldom';
import { SvgDocument } from '../domain/SvgDocument.js';
import { ShapeFactory } from '../domain/ShapeFactory.js';
import { Shape } from '../domain/Shape.js';
import { Group } from '../domain/Group.js';
import { Numbers } from '../domain/Numbers.js';
import type { LoadedDocument } from '../application/DocumentPort.js';
import { SvgTransform } from './SvgTransform.js';

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
    const reserved = new Set<string>(), warnings: string[] = [], counters = new Map<string, number>();
    const all = root.getElementsByTagName('*');
    for (let i = 0; i < all.length; i++) {
      const id = all.item(i)!.getAttribute('id');
      if (!id) continue;
      if (reserved.has(id)) throw new Error(`id already exists: ${id}`);
      reserved.add(id);
    }
    const importElement = (element: Element, inherited: ReadonlyMap<string, string>, outer: SvgTransform, depth: number): Shape => {
      if (depth > 256) throw new Error('SVG nesting exceeds 256 levels');
      if (element.namespaceURI && element.namespaceURI !== this.namespace) throw new Error('unsupported element namespace');
      const tag = element.localName ?? element.tagName;
      let id = element.getAttribute('id');
      if (!id) {
        let serial = counters.get(tag) ?? 0;
        do { id = tag + ++serial; } while (reserved.has(id));
        counters.set(tag, serial); reserved.add(id);
        warnings.push(`warning: assigned id ${id} to unnamed <${tag}>`);
      }
      const attrs = new Map<string, string>();
      for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes.item(i)!;
        if (!attr.name.startsWith('xmlns:')) attrs.set(attr.name, attr.value);
      }
      const transform = outer.compose(SvgTransform.parse(attrs.get('transform') ?? ''));
      const shape = this.factory.fromSvg(tag, id, attrs, element.textContent ?? '');
      const lengths = new Map(inherited);
      for (const key of ['font-size', 'stroke-width']) if (attrs.has(key)) lengths.set(key, attrs.get(key)!);
      if (shape instanceof Group) {
        for (const child of this.elements(element)) shape.add(importElement(child, lengths, transform, depth + 1));
        this.assertContainerText(element);
      } else {
        if (this.elements(element).length) throw new Error(`child elements not supported in <${tag}>`);
        if (shape.text === null && element.textContent?.trim()) throw new Error(`unexpected text in <${tag}>`);
        shape.scale(transform.scale); shape.move(transform.dx, transform.dy);
        if (transform.scale !== 1) {
          shape.importPresentation('stroke-width', String(this.length(lengths.get('stroke-width') ?? '1', 'stroke-width') * transform.scale));
          if (shape.text !== null) shape.importPresentation('font-size', String(this.length(lengths.get('font-size') ?? '16', 'font-size') * transform.scale));
        }
      }
      return shape;
    };
    this.assertContainerText(root);
    if (all.length > 20000) throw new Error('SVG exceeds 20000 elements');
    for (const child of this.elements(root)) document.add(importElement(child, new Map(), new SvgTransform(), 0));
    document.assertValid();
    return { document, warnings };
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
  private length(value: string, name: string): number {
    return Numbers.parse(value.trim().replace(/px$/, ''), name);
  }
  encode(document: SvgDocument): string {
    document.assertValid();
    const xml = new DOMImplementation().createDocument(this.namespace, 'svg', null);
    const root = xml.documentElement!;
    root.setAttribute('width', String(document.width)); root.setAttribute('height', String(document.height));
    root.setAttribute('viewBox', document.viewBox.join(' '));
    for (const shape of document.children) { root.appendChild(xml.createTextNode('\n  ')); root.appendChild(this.element(xml, shape, '  ')); }
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
