import * as _ from 'lodash';

import { Visitor } from './ast';
import { Path, Error, ErrorFn, ResourceSpecificationError } from './types';
import {
  PropertyTypes,
  PropertyValueType,
  PrimitiveType,
  Type,
  Exclusive,
  OnlyOne,
  AtLeastOne,
  isMultiplePropertyType,
} from './spec';
import * as yaml from './yaml';
import { isNoValue, isStringNumber, isStringBoolean, cfnFnName, withSuggestion } from './util';

// `_.forEach` which tracks the `Path` and understands how to step into `CfnFn`s
export function forEach(
  path: Path,
  as: Array<any>,
  fn: (path: Path, a: any, i: number | string) => void)
  : void {
  if (as instanceof yaml.If) {
    if (_.isArray(as.data) && as.data.length === 3) {
      _.forEach(as.data.slice(1, 3), (value, i) => {
        if (_.isObject(value) && !isNoValue(value)) {
          const p = path.concat([cfnFnName(as), (i + 1).toString()]);
          forEach(p, value, fn);
        }
      });
    }
  } else if (as instanceof yaml.CfnFn) {
    // Pull the *ItemType off of the CfnFn (if it has it) and create a
    // `CfnFnData` that represents the structure of this CfnFn's items This
    // allows us to validate things like `Fn::Split` which return a list of
    // strings and be able to step into the `Fn::Split` rather than cutting off
    // validation at the list level.
    let returnSpecs: PropertyValueType[];

    if (_.isFunction(as.returnSpec)) {
      returnSpecs = as.returnSpec();
    } else {
      returnSpecs = as.returnSpec;
    }

    const dataReturnSpecs = _.reduce(returnSpecs, (acc, spec) => {
      if (spec.PrimitiveItemType) {
        acc.push({ PrimitiveType: spec.PrimitiveItemType })
      } else if (spec.ItemType) {
        acc.push({ Type: spec.ItemType })
      }
      return acc;
    }, [] as PropertyValueType[]);

    const data = new yaml.CfnFnData(as.data, as.style, dataReturnSpecs);

    fn(path, data, cfnFnName(as));
  } else {
    _.forEach(as, (a, i) => {
      fn(path.concat(i.toString()), a, i);
    });
  }
}

// Validation functions
//
// These functions are designed to be chained so that only one error message is
// created for each element. For example:
//
//   validate.required(value) && validate.string(value);
//
// This will create only check if `value` is a string if it is considered to be
// present by the `requried` validation function. The functions return `false`
// when a violation is found. They can be used within a conditional to perform
// more complex validations, for example:
//
//   if (validate.required(value) && validate.string(value)) {
//     if(_.includes([...], value)) ...
//   }
//

export interface ValidationFn {
  (path: Path, o: any, addError: ErrorFn): boolean
}

export function cfnFn(cfnFn: yaml.CfnFn, spec: PropertyValueType): boolean {
  let returnSpec: PropertyValueType[];
  if (_.isFunction(cfnFn.returnSpec)) {
    returnSpec = cfnFn.returnSpec();
  } else {
    returnSpec = cfnFn.returnSpec;
  }
  // Test if any of the `returnSpec`'s match
  return _.some(returnSpec, (rs) => {
    // Test if `rs` is a superset of spec. This it to support testing
    // { Type: 'List' } without checking the ItemType.
    // I can't explain why this works, but https://stackoverflow.com/a/26127030
    return _.some([rs], spec);
  });
}

// Used to short-circuit validation checks. For example:
//
//  validate.optional(value) && validate.string(value);
//
export function optional(_path: Path, o: any, _addError: ErrorFn): boolean {
  return !_.isUndefined(o);
}

export function required(path: Path, o: any, addError: ErrorFn): boolean {
  if (_.isNil(o) || isNoValue(o)) {
    addError(path, 'is required');
    return false;
  } else {
    return true;
  }
}

// Validate an object
//
// Optionally validate the object's properties. For example:
//
//   validate.object(path, value, errors, {
//     Name: [validate.required, validate.string],
//     Age: [validate.optional, validate.number]
//   });
//
export function object(path: Path,
  o: any,
  addError: ErrorFn,
  properties: { [key: string]: ValidationFn[] } = {}): boolean {
  if (o instanceof yaml.CfnFn && cfnFn(o, { PrimitiveType: 'Json' })) {
    return true;
  } else if (_.isPlainObject(o)) {
    // Validate the objects properties
    _.forEach(properties, (fns, key) => {
      const p = path.concat(key);
      _.find(fns, (fn) => !fn(p, _.get(o, key), addError));
    });

    // Check for unknown keys
    const validKeys = _.keys(properties);
    if (!_.isEmpty(validKeys)) {
      const invalidKeys = _.difference(_.keys(o), validKeys);
      if (!_.isEmpty(invalidKeys)) {
        addError(path, `invalid properties: ${invalidKeys.join(', ')}`);
      }
    }
    return true;
  } else {
    addError(path, `must be an Object, got ${JSON.stringify(o)}`);
    return false;
  }
}

// Validate a list
//
// Optionally validate the list's items. For example:
//
//   validate.list(path, value, errors, [validate.string, validate.number]);
//
// will check that the list is of length two, with the first element a string
// and the second a number. Lists that are of one type with a variable number of
// items can be validated by passing a single validation function:
//
//   validate.list(path, value, errors, validate.string);
//
// which will check that all items in the list are of type string.
//
export function list(
  path: Path,
  o: any,
  addError: ErrorFn,
  items?: ValidationFn[] | ValidationFn): o is Array<any> {
  if (o instanceof yaml.CfnFn && cfnFn(o, { Type: 'List' })) {
    return true
  } else if (_.isArray(o)) {
    if (_.isArray(items)) {
      if (items.length === o.length) {
        _.forEach(items, (fn, i) => {
          fn(path.concat(i.toString()), o[i], addError);
        });
      } else {
        addError(path, `must be a List with ${items.length} items`);
      }
    } else if (items) {
      _.forEach(o, (item, i) => {
        items(path.concat(i.toString()), item, addError);
      });
    }
    return true;
  } else {
    addError(path, `must be a List, got ${JSON.stringify(o)}`);
    return false;
  }
}

export function string(path: Path, o: any, addError: ErrorFn, allowedValues: string[] = []): boolean {
  if (o instanceof yaml.CfnFn
    && (cfnFn(o, { PrimitiveType: 'String' }) || cfnFn(o, { PrimitiveType: 'Number' }))) {
    return true;
  } else if (_.isString(o)
             || _.isBoolean(o) // TODO better support 'true'/'false' in string values
             || _.isNumber(o) // YAML interprets number only strings as numbers
            ) {
    if(_.some(allowedValues)) {
      const str = o.toString();
      if(_.find(allowedValues, (v) => new RegExp(v, 'i').test(str))) {
        return true;
      } else {
        addError(path, `must be one of ${allowedValues.join(', ')}, got ${JSON.stringify(o)}`);
        return false;
      }
    } else {
      return true;
    }
  } else {
    addError(path, `must be a String, got ${JSON.stringify(o)}`);
    return false;
  }
}

export function number(path: Path, o: any, addError: ErrorFn): boolean {
  if (o instanceof yaml.CfnFn && cfnFn(o, { PrimitiveType: 'Number' })) {
    return true;
  } else if (_.isNumber(o)) {
    return true;
  } else if (isStringNumber(o)) {
    return true;
  } else {
    addError(path, `must be a Number, got ${o}`);
    return false;
  }
}

export function boolean(path: Path, o: any, addError: ErrorFn): boolean {
  if (o instanceof yaml.CfnFn && cfnFn(o, { PrimitiveType: 'Boolean' })) {
    return true;
  } else if (isStringBoolean(o)) {
    return true;
  } else if (_.isBoolean(o)) {
    return true;
  } else {
    addError(path, `must be a Boolean, got ${JSON.stringify(o)}`);
    return false;
  }
}

export function or(...fns: ValidationFn[]): ValidationFn {
  return (path: Path, value: any, addError: ErrorFn) => {
    const errs: Error[] = [];
    const f = (path: Path, message: string) => {
      errs.push({ path, message, source: '-unused-' });
    }
    const success = _.some(fns, (fn) => fn(path, value, f));
    if (!success) {
      const message = _.join(_.map(errs, (e) => e.message), ' or ');
      addError(path, message);
    }
    return success;
  }
}

export class Validator extends Visitor {
  protected errors: Error[];

  constructor(errors: Error[]) {
    super();
    this.errors = errors;
    this.addError = this.addError.bind(this);
  }

  protected addError(path: Path, message: string) {
    const source = this.constructor.name;
    this.errors.push({ path, message, source });
  }

  protected forEachWithPath<T>(
    path: Path,
    as: Array<T>,
    fn: (path: Path, a: T, i: number | string) => void)
    : void {
    _.forEach(as, (a, i) => {
      fn(path.concat(i.toString()), a, i);
    });
  }

}

function primitiveType(path: Path, primitiveType: PrimitiveType, property: any, addError: ErrorFn) {
  let validator: (path: Path, o: any, addError: ErrorFn) => boolean;
  switch (primitiveType) {
    case 'Boolean':
      validator = boolean;
      break;
    case 'Double':
      validator = number;
      break;
    case 'Integer':
      validator = number;
      break;
    case 'Json':
      validator = object;
      break;
    case 'Long':
      validator = number;
      break;
    case 'String':
      validator = string;
      break;
    case 'Timestamp':
      validator = string; // TODO better check
    default:
      throw new ResourceSpecificationError(`Unknown PrimitiveType '${primitiveType}'`, path);
  }
  validator.call(undefined, path, property, addError);
}

function atLeastOnePropertySpec(
  path: Path,
  propertyName: string,
  _property: object,
  resourceType: string,
  addError: ErrorFn) {
  const propertySpec = AtLeastOne.PropertyTypes[`${resourceType}.${propertyName}`];
  if (propertySpec) {
    _.forEach(propertySpec, (propertyNames) => {
      const present = _.filter(propertyNames, (property) => _.has(property, propertyName));
      if (present.length === 0) {
        addError(path, `at least one of ${propertyNames.join(', ')} must be provided`);
      }
    });
  }
}

function onlyOnePropertySpec(
  path: Path,
  propertyName: string,
  _property: object,
  resourceType: string,
  addError: ErrorFn) {
  const propertySpec = OnlyOne.PropertyTypes[`${resourceType}.${propertyName}`];
  if (propertySpec) {
    _.forEach(propertySpec, (propertyNames) => {
      const present = _.filter(propertyNames, (property) => _.has(property, propertyName));
      if (present.length > 1) {
        addError(path, `only one of ${propertyNames.join(', ')} can be provided`);
      }
    });
  }
}

function exclusivePropertySpec(
  path: Path,
  propertyName: string,
  property: object,
  resourceType: string,
  addError: ErrorFn) {
  const propertySpec = Exclusive.PropertyTypes[`${resourceType}.${propertyName}`];
  if (propertySpec) {
    _.forEach(propertySpec, (forbiddenProperties, propertyName) => {
      if (_.has(property, propertyName)) {
        _.forEach(forbiddenProperties, (forbiddenPropertyName) => {
          if (_.has(property, forbiddenPropertyName)) {
            addError(path, `${forbiddenPropertyName} can not be set if ${propertyName} is set`);
          }
        });
      }
    });
  }
}

function complexType(
  path: Path,
  propertyName: string,
  resourceType: string,
  type: Type,
  properties: any,
  addError: ErrorFn) {
  // TODO check that resourceType is valid
  const propertyType = _.get(PropertyTypes, `${resourceType}.${type}`) || _.get(PropertyTypes, type);
  if (propertyType) {
    if (object(path, properties, addError)) {
      exclusivePropertySpec(path, propertyName, properties, resourceType, addError);
      onlyOnePropertySpec(path, propertyName, properties, resourceType, addError);
      atLeastOnePropertySpec(path, propertyName, properties, resourceType, addError);
      forEach(path, properties, (path, property, name) => {
        let s: PropertyValueType;
        if (isMultiplePropertyType(propertyType)) {
          s = _.get(propertyType.Properties, name);
        } else {
          s = propertyType;
        }
        if (s) {
          if (s.PrimitiveType) {
            primitiveType(path, s.PrimitiveType, property, addError);
          } else if (s.Type === 'Map') {
            if (object(path, property, addError)) {
              forEach(path, property, (p, v, k) => {
                if (s.PrimitiveItemType) {
                  primitiveType(p, s.PrimitiveItemType, v, addError);
                } else if (s.ItemType) {
                  complexType(p, k.toString(), resourceType, s.ItemType, v, addError);
                } else {
                  throw new ResourceSpecificationError(`Unknown Map Type '${s}'`, p)
                }
              });
            }
          } else if (s.Type === 'List') {
            if (list(path, property, addError)) {
              forEach(path, property, (p, v, k) => {
                if (s.PrimitiveItemType) {
                  primitiveType(p, s.PrimitiveItemType, v, addError);
                } else if (s.ItemType) {
                  complexType(p, propertyName, resourceType, s.ItemType, v, addError);
                } else {
                  throw new ResourceSpecificationError(`Unknown List Type '${s}'`, p)
                }
              });
            }
          } else if (s.Type) {
            complexType(path, propertyName, resourceType, s.Type, property, addError);
          }
        } else {
          let message: string = `invalid property for ${type}`;
          if (isMultiplePropertyType(propertyType)) {
            message = withSuggestion(message, _.keys(propertyType.Properties), name as string);
          }
          addError(path, message);
        }
      });
    }
  } else {
    throw new ResourceSpecificationError(`Unknown Type '${propertyType}'`, path);
  }
}

export function spec(
  path: Path,
  propertyName: string,
  resourceType: string,
  propertyType: PropertyValueType,
  property: any,
  addError: ErrorFn) {
  if (propertyType.PrimitiveType) {
    primitiveType(path, propertyType.PrimitiveType, property, addError);
  } else if (propertyType.Type === 'Map') {
    if (object(path, property, addError)) {
      forEach(path, property, (p, v, i) => {
        if (propertyType.PrimitiveItemType) {
          primitiveType(p, propertyType.PrimitiveItemType, v, addError);
        } else if (propertyType.ItemType) {
          complexType(p, i.toString(), resourceType, propertyType.ItemType, v, addError);
        } else {
          throw new ResourceSpecificationError('No property type', p);
        }
      });
    }
  } else if (propertyType.Type === 'List') {
    if (list(path, property, addError)) {
      forEach(path, property, (p, v, i) => {
        if (propertyType.PrimitiveItemType) {
          primitiveType(p, propertyType.PrimitiveItemType, v, addError);
        } else if (propertyType.ItemType) {
          complexType(p, propertyName, resourceType, propertyType.ItemType, v, addError);
        } else {
          throw new ResourceSpecificationError('No property type', p);
        }
      });
    }
  } else if (propertyType.Type) {
    complexType(path, propertyName, resourceType, propertyType.Type, property, addError);
  } else {
    throw new ResourceSpecificationError('No property type', path);
  }
}
