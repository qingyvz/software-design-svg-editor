import { Rect } from '../domain/Rect.js';
import { Circle } from '../domain/Circle.js';
import { Ellipse } from '../domain/Ellipse.js';
import { Line } from '../domain/Line.js';
import { Text } from '../domain/Text.js';
import { Group } from '../domain/Group.js';
import { BuiltinShapeProvider } from '../domain/BuiltinShapeProvider.js';
import { ShapeFactory } from '../domain/ShapeFactory.js';

/** Default product policy belongs to the host, never to the registry. */
export class DefaultShapes {
  static create(): ShapeFactory {
    const factory = new ShapeFactory();
    factory.register(
      new BuiltinShapeProvider(
        'rect',
        ['x', 'y', 'width', 'height'],
        (id, n) => new Rect(id, n[0]!, n[1]!, n[2]!, n[3]!),
        { paint: 'fill' },
      ),
    );
    factory.register(
      new BuiltinShapeProvider(
        'circle',
        ['cx', 'cy', 'r'],
        (id, n) => new Circle(id, n[0]!, n[1]!, n[2]!),
        { paint: 'fill' },
      ),
    );
    factory.register(
      new BuiltinShapeProvider(
        'ellipse',
        ['cx', 'cy', 'rx', 'ry'],
        (id, n) => new Ellipse(id, n[0]!, n[1]!, n[2]!, n[3]!),
        { paint: 'fill' },
      ),
    );
    factory.register(
      new BuiltinShapeProvider(
        'line',
        ['x1', 'y1', 'x2', 'y2'],
        (id, n) => new Line(id, n[0]!, n[1]!, n[2]!, n[3]!),
        { paint: 'stroke' },
      ),
    );
    factory.register(
      new BuiltinShapeProvider(
        'text',
        ['x', 'y'],
        (id, n, text) => new Text(id, n[0]!, n[1]!, text),
        { text: true },
      ),
    );
    factory.register(new BuiltinShapeProvider('g', [], (id) => new Group(id)));
    return factory;
  }
}
