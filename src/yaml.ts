import * as yaml from 'js-yaml';
import {PropertyValueType} from './spec';

type SupportedFns = Array<typeof Tag>;

export class Tag<T> {
  public data: T;
  public supportedFns: SupportedFns = [];
  public doc: string = 'http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference.html';
  public spec: PropertyValueType

  constructor(data: T) {
    this.data = data;
  }
}

export class Ref extends Tag<string> {
  doc = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-ref.html';
  spec = {PrimitiveType: 'String'};
}

export class Sub extends Tag<string | [string, object]> {
  doc = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-sub.html';
  spec = {PrimitiveType: 'String'};
  supportedFns: SupportedFns = [Base64, FindInMap, GetAtt, GetAZs, If, ImportValue, Join, Select, Ref];
}

export class FindInMap extends Tag<[string, string, string]> {
  doc = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-findinmap.html';
  spec = {PrimitiveType: 'String'};
  supportedFns: SupportedFns = [FindInMap, Ref];
}

export class GetAtt extends Tag<string | [string, string]> {
  doc = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-getatt.html';
  spec = {
    PrimitiveType: 'String'
  }
  supportedFns: SupportedFns = [Ref]; // Only for attribute name
}

export class ImportValue extends Tag<string | object> {
  doc = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-importvalue.html'
  spec = {
    PrimitiveType: 'String'
  }
  supportedFns: SupportedFns = [Base64, FindInMap, If, Join, Select, Split, Sub, Ref];
}

export class Base64 extends Tag<string|object> {
  doc = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-base64.html';
  spec = {PrimitiveType: 'String'};
  supportedFns: SupportedFns = []; // Any that returns a string
}

export class Cidr extends Tag<[string, string, string]> {
  doc = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-cidr.html';
  spec = {Type: 'List', PrimitiveItemType: 'String'};
}

export class GetAZs extends Tag<string> {
  doc = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-getavailabilityzones.html';
  spec = {Type: 'List', PrimitiveItemType: 'String'};
}
export class Join extends Tag<string> {
  doc = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-join.html';
  spec = {
    PrimitiveType: 'String'
  }
  allowedFns: [Base64, FindInMap, GetAtt, GetAZs, If, ImportValue, Join, Split, Select, Sub, Ref];
}
export class Split extends Tag<string> {
  doc = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-split.html';
  spec = {Type: 'List', PrimitiveItemType: 'String'}
  allowedFns: [Base64, FindInMap, GetAtt, GetAZs, If, ImportValue, Join, Select, Sub, Ref];
}
export class Select extends Tag<[string|number, [any]]> {
  doc = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-select.html';
  spec = {PrimitiveType: 'String'}
  allowedFns = [FindInMap, GetAtt, GetAZs, If, Split, Ref];
}
// export class GetParam extends Tag<string> {
//   doc = 'http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/continuous-delivery-codepipeline-action-reference.html'
// }
//
export class And extends Tag<string[]> {
  doc = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-conditions.html#intrinsic-function-reference-conditions-and';
  spec = {Type: 'Boolean'};
  allowedFns: SupportedFns = [FindInMap, Ref, And, Equals, If, Not, Or];
}
export class Equals extends Tag<string> {
  doc = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-conditions.html#intrinsic-function-reference-conditions-equals';
  spec = {Type: 'Boolean'};
  allowedFns: SupportedFns = [FindInMap, Ref, And, Equals, If, Not, Or];
}
export class If extends Tag<[string, string, string]> {
  doc = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-conditions.html#intrinsic-function-reference-conditions-if';
  allowedFns = [Base64, FindInMap, GetAtt, GetAZs, If, Join, Select, Sub, Ref];
  spec = {Type: 'String'};
}
export class Not extends Tag<string> {
  doc = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-conditions.html#intrinsic-function-reference-conditions-not';
  allowedFns: SupportedFns = [FindInMap, Ref, And, Equals, If, Not, Or];
  spec = {Type: 'Boolean'};
}
export class Or extends Tag<string> {
  doc = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-conditions.html#intrinsic-function-reference-conditions-or';
  allowedFns: SupportedFns = [FindInMap, Ref, And, Equals, If, Not, Or];
  spec = {Type: 'Boolean'};
}

function tag(cls: any, kind: 'scalar' | 'mapping' | 'sequence') {
  return new yaml.Type(`!${cls.name}`, {
    kind,
    instanceOf: cls,
    construct: (data: any) => new cls(data),
    represent: (node: any) => node.data
  });
}

const types = [
  tag(Ref, 'scalar'),
  tag(Base64, 'scalar'),
  tag(Base64, 'mapping'),
  tag(FindInMap, 'sequence'),
  tag(GetAtt, 'scalar'),
  tag(GetAtt, 'sequence'),
  tag(GetAZs, 'scalar'),
  tag(GetAZs, 'mapping'),
  tag(GetAZs, 'sequence'),
  tag(ImportValue, 'scalar'),
  tag(ImportValue, 'mapping'),
  tag(Join, 'sequence'),
  tag(Split, 'sequence'),
  tag(Ref, 'scalar'),
  tag(Ref, 'sequence'),
  tag(Select, 'sequence'),
  tag(Sub, 'scalar'),
  tag(Sub, 'sequence'),
  tag(Sub, 'mapping'),
  // tag(GetParam, 'sequence'),
  tag(And, 'sequence'),
  tag(Equals, 'sequence'),
  tag(If, 'sequence'),
  tag(Not, 'sequence'),
  tag(Or, 'sequence'),
];

const schema = yaml.Schema.create(types);

export function load(contents: string) {
  return yaml.load(contents, { schema });
}

export function dump(obj: object) {
  return yaml.dump(obj, { schema }).replace(/!<!([^>]+?)>/g, '!$1');
}