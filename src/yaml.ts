import * as _ from 'lodash';
import * as yaml from 'js-yaml';
import { Path, Error } from './types';
import { PropertyValueType } from './spec';
import * as validate from './validate';

type SupportedFns = Array<typeof CfnFn>;
type PropertyValueTypeFn = () => PropertyValueType;
type ParamSpecFn = (path: Path, errors: Error[]) => void;

// Function styles:
// Object => { "Ref": "Resource" }
// YAMLTag => !Ref Resource
export type Style = 'Object' | 'YAMLTag';

// Symbols are used to hide properties from yaml.dump when style = 'Object'
const foo = Symbol('foo');
const style = Symbol('style');
const paramSpec = Symbol('paramSpec');
const returnSpec = Symbol('returnSpec');
const supportedFns = Symbol('supportedFns');
const data = Symbol('data');
const doc = Symbol('doc');

export class CfnFn {
  public [data]: any;
  public [supportedFns]: SupportedFns = [];
  public [doc]: string = 'http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference.html';
  public [paramSpec]: PropertyValueType | ParamSpecFn;
  public [returnSpec]: PropertyValueType | PropertyValueTypeFn = {};
  public [style]: Style;

  constructor(d: any, s: Style) {
    this[data] = d;
    this[style] = s;
    let name = this.constructor.name;
    if (name !== 'Ref' && !this.isYamlTag()) {
      name = `Fn::${name}`;
    }
    // @ts-ignore
    this[name] = d;
  }

  set data(d: any) {
    this[data] = d;
  }

  get data(): any {
    return this[data];
  }

  get returnSpec(): PropertyValueType | PropertyValueTypeFn {
    return this[returnSpec];
  }

  get paramSpec(): PropertyValueType | ParamSpecFn {
    return this[paramSpec];
  }

  get supportedFns(): SupportedFns {
    return this[supportedFns];
  }

  isYamlTag() {
    return this[style] === 'YAMLTag';
  }

  toString() {
    return `${this.constructor.name} ${this[data]}`
  }
}

export class Ref extends CfnFn {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-ref.html';
  [paramSpec] = { PrimitiveType: 'String' };
  [returnSpec] = { PrimitiveType: 'String' };
  [supportedFns]: SupportedFns = [];
}

export class Condition extends CfnFn {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-conditions.html';
  [paramSpec] = { PrimitiveType: 'String' };
  [returnSpec] = { PrimitiveType: 'Boolean' };
  [supportedFns]: SupportedFns = [];
}

export class Sub extends CfnFn {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-sub.html';
  [paramSpec] = (path: Path, errors: Error[]) => {
    if (_.isArray(this.data) && this.data.length === 2) {
      validate.string(path.concat('0'), this.data[0], errors);
      validate.object(path.concat('1'), this.data[1], errors);
    } else if (!_.isString(this.data)) {
      errors.push({ path, message: 'must be a String or List of Sting and Map' });
    }
  };
  [returnSpec] = { PrimitiveType: 'String' };
  [supportedFns]: SupportedFns = [
    Base64, FindInMap, GetAtt, GetAZs, If, ImportValue, Join, Select, Ref
  ];
}

export class FindInMap extends CfnFn {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-findinmap.html';
  [returnSpec] = { PrimitiveType: 'String' };
  [supportedFns]: SupportedFns = [FindInMap, Ref];
  [paramSpec] = (path: Path, errors: Error[]) => {
    if (_.isArray(this.data) && this.data.length === 3) {
      _.forEach(this.data, (value, i) => {
        validate.string(path.concat(i.toString()), value, errors);
      })
    }
  };
}

export class GetAtt extends CfnFn {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-getatt.html';
  [paramSpec] = (path: Path, errors: Error[]) => {
    if (this.isYamlTag() && _.isString(this.data)) {
      if (!_.includes(this.data, '.')) {
        errors.push({ path, message: 'must be a String that contains a `.`' });
      }
    } else if (!(_.isArray(this.data) && this.data.length === 2
      && _.every(this.data, _.isString))) {
      if (this.isYamlTag()) {
        errors.push({ path, message: 'must be a String or a List of two Strings' });
      } else {
        errors.push({ path, message: 'must be a List of two Strings' });
      }
    }
  };
  [returnSpec] = { PrimitiveType: 'String' };
  [supportedFns]: SupportedFns = [Ref]; // Only for attribute name
}

export class ImportValue extends CfnFn {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-importvalue.html';
  [returnSpec] = { PrimitiveType: 'String' };
  [supportedFns]: SupportedFns = [
    Base64, FindInMap, If, Join, Select, Split, Sub, Ref
  ];
}

export class Base64 extends CfnFn {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-base64.html';
  [paramSpec] = { PrimitiveType: 'String' };
  [returnSpec] = { PrimitiveType: 'String' };
  [supportedFns]: SupportedFns = [
    Ref, Sub, FindInMap, GetAtt, ImportValue, Base64, Cidr,
    GetAZs, Join, Split, Select, And, Equals, If, Not, Or
  ];
}

export class Cidr extends CfnFn {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-cidr.html';
  [returnSpec] = { Type: 'List', PrimitiveItemType: 'String' };
}

export class GetAZs extends CfnFn {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-getavailabilityzones.html';
  [returnSpec] = { Type: 'List', PrimitiveItemType: 'String' };
}
export class Join extends CfnFn {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-join.html';
  [returnSpec] = {
    PrimitiveType: 'String'
  };
  [supportedFns]: SupportedFns = [
    Base64, FindInMap, GetAtt, GetAZs, If, ImportValue,
    Join, Split, Select, Sub, Ref
  ];
}
export class Split extends CfnFn {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-split.html';
  [returnSpec] = { Type: 'List', PrimitiveItemType: 'String' };
  [supportedFns]: SupportedFns = [
    Base64, FindInMap, GetAtt, GetAZs, If, ImportValue, Join, Select, Sub, Ref
  ];
}
export class Select extends CfnFn {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-select.html';
  [returnSpec] = { PrimitiveType: 'String' };
  [supportedFns]: SupportedFns = [FindInMap, GetAtt, GetAZs, If, Split, Ref];
}
// export class GetParam extends CfnFn {
//   [doc] = 'http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/continuous-delivery-codepipeline-action-reference.html'
// }
//
export class And extends CfnFn {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-conditions.html#intrinsic-function-reference-conditions-and';
  [paramSpec] = { Type: 'List', PrimitiveItemType: 'Boolean' };
  [returnSpec] = { PrimitiveType: 'Boolean' };
  [supportedFns]: SupportedFns = [FindInMap, Ref, And, Equals, If, Not, Or, Condition];
}
export class Equals extends CfnFn {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-conditions.html#intrinsic-function-reference-conditions-equals';
  [paramSpec] = (path: Path, errors: Error[]) => {
    if (!(_.isArray(this.data) && this.data.length === 2)) {
      errors.push({ path, message: 'must be a List of length 2' });
    }
  };
  [returnSpec] = { PrimitiveType: 'Boolean' };
  [supportedFns]: SupportedFns = [FindInMap, Ref, And, Equals, If, Not, Or, Condition];
}
export class If extends CfnFn {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-conditions.html#intrinsic-function-reference-conditions-if';
  [supportedFns]: SupportedFns = [
    Base64, FindInMap, GetAtt, GetAZs, Join, Select, Sub, Ref,
    Condition, And, Equals, If, Not, Or
  ];
  [paramSpec] = (path: Path, errors: Error[]) => {
    if (validate.list(path, this.data, errors)) {
      if (this.data.length === 3) {
        validate.boolean(path.concat('0'), this.data[0], errors);
      } else {
        errors.push({ path, message: 'must have three elements' });
      }
    }
  };
  [returnSpec] = () => {
    const value = this.data;
    if (_.isArray(value) && value.length === 3) {
      const a = paramToReturnSpec(value[1]);
      const b = paramToReturnSpec(value[2]);
      if (_.isEqual(a, b)) {
        return a;
      }
    }
    return {};
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
function paramToReturnSpec(o: any): PropertyValueType {
  if (_.isString(o)) {
    return { PrimitiveType: 'String' };
  } else if (_.isNumber(o)) {
    return { PrimitiveType: 'Number' };
  } else if (_.isBoolean(o)) {
    return { PrimitiveType: 'Boolean' };
  } else if (o instanceof CfnFn) {
    if (_.isFunction(o.returnSpec)) {
      return o.returnSpec();
    } else {
      return o.returnSpec;
    }
  } else {
    return {};
  }
}
export class Not extends CfnFn {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-conditions.html#intrinsic-function-reference-conditions-not';
  [supportedFns]: SupportedFns = [FindInMap, Ref, And, Equals, If, Not, Or, Condition];
  [paramSpec] = (path: Path, errors: Error[]) => {
    if (_.isArray(this.data)
      && this.data.length === 1
      && _.isString(this.data[0])) {
      errors.push({ path, message: 'must be a List of one String' });
    }
  };
  [returnSpec] = { PrimitiveType: 'Boolean' };
}
export class Or extends CfnFn {
  [doc] = 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-conditions.html#intrinsic-function-reference-conditions-or';
  [supportedFns]: SupportedFns = [FindInMap, Ref, And, Equals, If, Not, Or, Condition];
  [paramSpec] = { Type: 'List', PrimitiveItemType: 'Boolean' };
  [returnSpec] = { PrimitiveType: 'Boolean' };
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
