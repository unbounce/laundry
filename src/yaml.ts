import * as _ from 'lodash';
import * as yaml from 'js-yaml';
import { Path, Error } from './types';
import { PropertyValueType } from './spec';
import { valueToSpecs, cfnFnName } from './util';

type SupportedFns = Array<typeof CfnFn>;
type PropertyValueTypeFn = () => PropertyValueType[];

// Function styles:
// Object => { "Ref": "Resource" }
// YAMLTag => !Ref Resource
export type Style = 'Object' | 'YAMLTag';

// Symbols are used to hide properties from yaml.dump when style = 'Object'
const foo = Symbol('foo');
const style = Symbol('style');
const returnSpec = Symbol('returnSpec');
const supportedFns = Symbol('supportedFns');
const data = Symbol('data');
const doc = Symbol('doc');

export class CfnFn {
  public [data]: any;
  public [supportedFns]: SupportedFns = [];
  public [doc]: string = 'http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference.html';
  public [returnSpec]: PropertyValueType[] | PropertyValueTypeFn = [];
  public [style]: Style;

  constructor(d: any, s: Style) {
    this[data] = d;
    this[style] = s;

    // Set a property based on the class name for JSON dumping and object
    // iteration. Eg. for `new Ref(value)` will set 'Ref' on that object to
    // `value`.
    const name = cfnFnName(this);
    // @ts-ignore
    this[name] = d;
  }

  set data(d: any) {
    this[data] = d;
  }

  get data(): any {
    return this[data];
  }

  get returnSpec(): PropertyValueType[] | PropertyValueTypeFn {
    return this[returnSpec];
  }

  set returnSpec(p: PropertyValueType[] | PropertyValueTypeFn) {
    this[returnSpec] = p;
  }

  get supportedFns(): SupportedFns {
    return this[supportedFns];
  }

  isYamlTag() {
    return this[style] === 'YAMLTag';
  }

  get style(): Style {
    return this[style]
  }

  toString() {
    return `${this.constructor.name} ${this[data]}`
  }
}

export class Ref extends CfnFn {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-ref.html';
  // TODO Ref can return non-strings
  [returnSpec] = [{ PrimitiveType: 'String' }];
  [supportedFns]: SupportedFns = [];
}

export class Condition extends CfnFn {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-conditions.html';
  [returnSpec] = [{ PrimitiveType: 'Boolean' }];
  [supportedFns]: SupportedFns = [];
}

export class Sub extends CfnFn {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-sub.html';
  [returnSpec] = [{ PrimitiveType: 'String' }];
  [supportedFns]: SupportedFns = [
    Base64, FindInMap, GetAtt, GetAZs, If, ImportValue, Join, Select, Ref, Condition, Sub
  ];
}

export class FindInMap extends CfnFn {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-findinmap.html';
  [returnSpec] = [{ PrimitiveType: 'String' }];
  [supportedFns]: SupportedFns = [FindInMap, Ref];
}

export class GetAtt extends CfnFn {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-getatt.html';
  // TODO GetAtt can return non-strings, such as
  // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-directoryservice-microsoftad.html#w2ab1c21c10c90c13c11
  // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-iot1click-device.html#aws-resource-iot1click-device-returnvalues
  // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-waitcondition.html#w2ab1c21c10c51c42c19
  [returnSpec] = [{ PrimitiveType: 'String' }];
  [supportedFns]: SupportedFns = [Ref]; // Only for attribute name
}

export class ImportValue extends CfnFn {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-importvalue.html';
  [returnSpec] = [{ PrimitiveType: 'String' }, { PrimitiveType: 'Number' }, { PrimitiveType: 'Boolean' }];
  [supportedFns]: SupportedFns = [
    Base64, FindInMap, If, Join, Select, Split, Sub, Ref, Condition
  ];
}

export class Base64 extends CfnFn {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-base64.html';
  [returnSpec] = [{ PrimitiveType: 'String' }];
  [supportedFns]: SupportedFns = [
    Ref, Sub, FindInMap, GetAtt, ImportValue, Base64, Cidr,
    GetAZs, Join, Split, Select, And, Equals, If, Not, Or, Condition
  ];
}

export class Cidr extends CfnFn {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-cidr.html';
  [returnSpec] = [{ Type: 'List', PrimitiveItemType: 'String' }];
  [supportedFns]: SupportedFns = [Select, Ref, GetAtt];
}

export class GetAZs extends CfnFn {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-getavailabilityzones.html';
  [returnSpec] = [{ Type: 'List', PrimitiveItemType: 'String' }];
  [supportedFns]: SupportedFns = [Ref];
}
export class Join extends CfnFn {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-join.html';
  [returnSpec] = [{ PrimitiveType: 'String' }];
  [supportedFns]: SupportedFns = [
    Base64, FindInMap, GetAtt, GetAZs, If, ImportValue,
    Join, Split, Select, Sub, Ref, Condition
  ];
}
export class Split extends CfnFn {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-split.html';
  [returnSpec] = [{ Type: 'List', PrimitiveItemType: 'String' }];
  [supportedFns]: SupportedFns = [
    Base64, FindInMap, GetAtt, GetAZs, If, ImportValue, Join, Select, Sub, Ref, Condition
  ];
}
export class Select extends CfnFn {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-select.html';
  [returnSpec] = [{ PrimitiveType: 'String' }];
  [supportedFns]: SupportedFns = [FindInMap, GetAtt, GetAZs, If, Split, Ref, Cidr, Select];
}
// export class GetParam extends CfnFn {
//   [doc] = 'http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/continuous-delivery-codepipeline-action-reference.html'
// }
//
export class And extends CfnFn {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-conditions.html#intrinsic-function-reference-conditions-and';
  [returnSpec] = [{ PrimitiveType: 'Boolean' }];
  [supportedFns]: SupportedFns = [FindInMap, Ref, And, Equals, If, Not, Or, Condition];
}
export class Equals extends CfnFn {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-conditions.html#intrinsic-function-reference-conditions-equals';
  [returnSpec] = [{ PrimitiveType: 'Boolean' }];
  [supportedFns]: SupportedFns = [FindInMap, Ref, And, Equals, If, Not, Or, Condition];
}
export class If extends CfnFn {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-conditions.html#intrinsic-function-reference-conditions-if';
  [supportedFns]: SupportedFns = [
    Base64, FindInMap, GetAtt, GetAZs, Join, Select, Sub, Ref,
    Condition, And, Equals, If, Not, Or, ImportValue
  ];
  [returnSpec] = () => {
    const value = this.data;
    if (_.isArray(value) && value.length === 3) {
      const a = valueToSpecs(value[1]);
      const b = valueToSpecs(value[2]);
      if (a === null && b !== null) {
        return b;
      } else if (a !== null && b === null) {
        return a;
      } else if (_.isEqual(a, b) && a !== null) {
        return a;
      }
    }
    return [];
  };

  constructor(d: any, s: Style) {
    super(d, s);
    // Replace string representation of Condition with Condition object, for
    // example: !If [SomeCondition, 1, 2]. This is not ideal as error messages
    // will not read perfectly, but this is the cleanest way to validate these
    // values properly.
    if (_.isArray(d) && _.isString(d[0])) {
      d[0] = new Condition(d[0], s);
    }
  }
}
export class Not extends CfnFn {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-conditions.html#intrinsic-function-reference-conditions-not';
  [supportedFns]: SupportedFns = [FindInMap, Ref, And, Equals, If, Not, Or, Condition];
  [returnSpec] = [{ PrimitiveType: 'Boolean' }];
}
export class Or extends CfnFn {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-conditions.html#intrinsic-function-reference-conditions-or';
  [supportedFns]: SupportedFns = [FindInMap, Ref, And, Equals, If, Not, Or, Condition];
  [returnSpec] = [{ PrimitiveType: 'Boolean' }];
}

// Placeholder to use when stepping into a CfnFn for validation.
// See forEach in validate.ts
export class CfnFnData extends CfnFn {
  [supportedFns]: SupportedFns = [CfnFn];

  constructor(d: any, s: Style, rs: PropertyValueType[]) {
    super(d, s);
    this.returnSpec = rs;
  }

  toJSON() {
    return this[data];
  }
}

function tag(cls: any) {
  // Accept all 'kinds' so that js-yaml will load invalid formats and then we
  // can lint them
  return _.map(['scalar', 'mapping', 'sequence'], (kind) => {
    // @ts-ignore
    // predicate is mis-typed in the type definitions
    return new yaml.Type(`!${cls.name}`, {
      kind,
      construct: (data: any) => new cls(data, 'YAMLTag'),
      represent: (node: any) => node.data,
      predicate: (node: any) => node instanceof cls && node.isYamlTag()
    });
  });
}

const types = _.concat(
  tag(Ref),
  tag(Sub),
  tag(GetAtt),
  tag(Base64),
  tag(Cidr),

  tag(FindInMap),
  tag(GetAZs),
  tag(ImportValue),
  tag(Join),
  tag(Split),
  tag(Select),
  // tag(GetParam),
  tag(Condition),
  tag(And),
  tag(Equals),
  tag(If),
  tag(Not),
  tag(Or),
);

const schema = yaml.Schema.create(yaml.JSON_SCHEMA, types);

export function load(contents: string) {
  return yaml.load(contents, { schema, json: true });
}

export function dump(obj: object) {
  return yaml.dump(obj, { schema }).replace(/!<!([^>]+?)>/g, '!$1');
}
