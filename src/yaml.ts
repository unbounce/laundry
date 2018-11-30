import * as _ from 'lodash';
import * as yaml from 'js-yaml';
import {Path, Error} from './types';
import {PropertyValueType} from './spec';

type SupportedFns = Array<typeof CfnFn>;
type PropertyValueTypeFn = () => PropertyValueType;
type ParamSpecFn = (path: Path, errors: Error[]) => void;

// Function styles:
// JSON => { "Ref": "Resource" }
// YAML => !Ref Resource
export type Style = 'JSON' | 'YAML';

// Symbols are used to hid properties from yaml.dump when style = 'JSON'
const foo = Symbol('foo');
const style = Symbol('style');
const paramSpec = Symbol('paramSpec');
const returnSpec = Symbol('returnSpec');
const supportedFns = Symbol('supportedFns');
const data = Symbol('data');
const doc = Symbol('doc');

export class CfnFn<T = any> {
  public [data]: T;
  public [supportedFns]: SupportedFns = [];
  public [doc]: string = 'http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference.html';
  public [paramSpec]: PropertyValueType|ParamSpecFn;
  public [returnSpec]: PropertyValueType|PropertyValueTypeFn = {};
  public [style]: Style;

  constructor(d: T, s: Style) {
    this[data] = d;
    this[style] = s;
    let name = this.constructor.name;
    if(name !== 'Ref') {
      name = `Fn::${name}`;
    }
    // @ts-ignore
    this[name] = d;
  }

  set data(d: T) {
    this[data] = d;
  }

  get data(): T {
    return this[data];
  }

  get returnSpec(): PropertyValueType|PropertyValueTypeFn {
    return this[returnSpec];
  }

  get paramSpec(): PropertyValueType|ParamSpecFn {
    return this[paramSpec];
  }

  get supportedFns(): SupportedFns {
    return this[supportedFns];
  }

  isYAML() {
    return this[style] === 'YAML';
  }

  toString() {
    return `${this.constructor.name} ${this[data]}`
  }

  toJSON() {
    return { [this.constructor.name]: this[data] };
  }
}

export class Ref extends CfnFn<string> {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-ref.html';
  [paramSpec] =  {PrimitiveType: 'String'};
  [returnSpec] = {PrimitiveType: 'String'};
}

export class Sub extends CfnFn<string | [string, object]> {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-sub.html';
  [paramSpec] =  {PrimitiveType: 'String'};
  [returnSpec] = {PrimitiveType: 'String'};
  [supportedFns]: SupportedFns = [Base64, FindInMap, GetAtt, GetAZs, If, ImportValue, Join, Select, Ref];
}

export class FindInMap extends CfnFn<[string, string, string]> {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-findinmap.html';
  [returnSpec] = {PrimitiveType: 'String'};
  [supportedFns]: SupportedFns = [FindInMap, Ref];
}

export class GetAtt extends CfnFn<string | [string, string]> {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-getatt.html';
  [paramSpec] =  (path: Path, errors: Error[]) => {
    if(this.isYAML() && _.isString(this.data) ) {
      if(!_.includes(this.data, '.')) {
        errors.push({path, message: 'must be in the format `Resource.Attribute`'});
      }
    } else if(_.isArray(this.data) && this.data.length === 2) {
      errors.push({path, message: 'must be in the format `[Resource, Attribute]`'});
    } else {
      if(this.isYAML()) {
        errors.push({path, message: 'must be in the format `Resource.Attribute` or `[Resource, Attribute]`'});
      } else {
        errors.push({path, message: 'must be in the format `[Resource, Attribute]`'});
      }
    }
  };
  [returnSpec] = {PrimitiveType: 'String'};
  [supportedFns]: SupportedFns = [Ref]; // Only for attribute name
}

export class ImportValue extends CfnFn<string | object> {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-importvalue.html';
  [returnSpec] = {PrimitiveType: 'String'};
  [supportedFns]: SupportedFns = [Base64, FindInMap, If, Join, Select, Split, Sub, Ref];
}

export class Base64 extends CfnFn<string|object> {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-base64.html';
  [returnSpec] = {PrimitiveType: 'String'};
  [supportedFns]: SupportedFns = [Ref, Sub, FindInMap, GetAtt, ImportValue, Base64, Cidr, GetAZs, Join, Split, Select, And, Equals, If, Not, Or];
}

export class Cidr extends CfnFn<[string, string, string]> {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-cidr.html';
  [returnSpec] = {Type: 'List', PrimitiveItemType: 'String'};
}

export class GetAZs extends CfnFn<string> {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-getavailabilityzones.html';
  [returnSpec] = {Type: 'List', PrimitiveItemType: 'String'};
}
export class Join extends CfnFn<string> {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-join.html';
  [returnSpec] = {
    PrimitiveType: 'String'
  }
  allowedFns: [Base64, FindInMap, GetAtt, GetAZs, If, ImportValue, Join, Split, Select, Sub, Ref];
}
export class Split extends CfnFn<string> {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-split.html';
  [returnSpec] = {Type: 'List', PrimitiveItemType: 'String'}
  allowedFns: [Base64, FindInMap, GetAtt, GetAZs, If, ImportValue, Join, Select, Sub, Ref];
}
export class Select extends CfnFn<[string|number, [any]]> {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-select.html';
  [returnSpec] = {PrimitiveType: 'String'}
  allowedFns = [FindInMap, GetAtt, GetAZs, If, Split, Ref];
}
// export class GetParam extends CfnFn<string> {
//   [doc] = 'http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/continuous-delivery-codepipeline-action-reference.html'
// }
//
export class And extends CfnFn<string[]> {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-conditions.html#intrinsic-function-reference-conditions-and';
  [returnSpec] = {Type: 'Boolean'};
  allowedFns: SupportedFns = [FindInMap, Ref, And, Equals, If, Not, Or];
}
export class Equals extends CfnFn<string> {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-conditions.html#intrinsic-function-reference-conditions-equals';
  [returnSpec] = {Type: 'Boolean'};
  allowedFns: SupportedFns = [FindInMap, Ref, And, Equals, If, Not, Or];
}
export class If extends CfnFn<[string, string|CfnFn, string|CfnFn]> {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-conditions.html#intrinsic-function-reference-conditions-if';
  allowedFns = [Base64, FindInMap, GetAtt, GetAZs, If, Join, Select, Sub, Ref];
  [returnSpec] = () => {
    const value = this.data;
    if(_.isArray(value) && value.length === 3) {
      const a = paramToReturnSpec(value[1]);
      const b = paramToReturnSpec(value[2]);
      if(_.isEqual(a, b)) {
        return a;
      }
    }
    return {};
  };
}
function paramToReturnSpec(o: any): PropertyValueType {
  if(_.isString(o)) {
    return { PrimitiveType: 'String' };
  } else if(_.isNumber(o)) {
    return { PrimitiveType: 'Number' };
  } else if(_.isBoolean(o)) {
    return { PrimitiveType: 'Boolean' };
  } else if (o instanceof CfnFn) {
    if(_.isFunction(o.returnSpec)) {
      return o.returnSpec();
    } else {
      return o.returnSpec;
    }
  } else {
    return {};
  }
}
export class Not extends CfnFn<string> {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-conditions.html#intrinsic-function-reference-conditions-not';
  allowedFns: SupportedFns = [FindInMap, Ref, And, Equals, If, Not, Or];
  [returnSpec] = {Type: 'Boolean'};
}
export class Or extends CfnFn<string> {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-conditions.html#intrinsic-function-reference-conditions-or';
  allowedFns: SupportedFns = [FindInMap, Ref, And, Equals, If, Not, Or];
  [returnSpec] = {Type: 'Boolean'};
}

function tag(cls: any, kind: 'scalar' | 'mapping' | 'sequence') {
  // @ts-ignore
  return new yaml.Type(`!${cls.name}`, {
    kind,
    // instanceOf: cls,
    construct: (data: any) => new cls(data, 'YAML'),
    represent: (node: any) => node.data,
    predicate: (node: any) => node instanceof cls && node.isYAML()
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

const schema = yaml.Schema.create(yaml.JSON_SCHEMA, types);

export function load(contents: string) {
  return yaml.load(contents, { schema });
}

export function dump(obj: object) {
  return yaml.dump(obj, { schema }).replace(/!<!([^>]+?)>/g, '!$1');
}
