import { DefaultShapes } from '../src/host/DefaultShapes.js';
import { Editor } from '../src/application/Editor.js';
import type { DocumentPort } from '../src/application/DocumentPort.js';
import { AttributeHandlers } from '../src/application/AttributeHandlers.js';
import { TreeDecorators } from '../src/application/TreeDecorators.js';
import { SvgCodec } from '../src/infrastructure/SvgCodec.js';
import { NodeDocumentStore } from '../src/infrastructure/NodeDocumentStore.js';
import type { ShapeFactory } from '../src/domain/ShapeFactory.js';

export class Fixtures {
  static shapes(): ShapeFactory { return DefaultShapes.create(); }
  static editor(documents: DocumentPort, shapes = DefaultShapes.create(), attributes = new AttributeHandlers(), decorators = new TreeDecorators()): Editor {
    return new Editor(documents, shapes, attributes, decorators);
  }
  static codec(shapes = DefaultShapes.create()): SvgCodec { return new SvgCodec(shapes); }
  static store(codec = Fixtures.codec()): NodeDocumentStore { return new NodeDocumentStore(codec); }
}
