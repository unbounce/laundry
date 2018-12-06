import * as _ from 'lodash';

import { Visitor } from './ast';
import { Path, Error, ResourceSpecificationError } from './types';
import {
  PropertyTypes,
  PropertyValueType,
  PrimitiveType,
  Type
} from './spec';
import * as yaml from './yaml';
import { forEachWithPath, isNoValue } from './util';

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

interface ValidationFn {
  (path: Path, o: any, errors: Error[]): boolean
}

export function cfnFn(cfnFn: yaml.CfnFn, spec: PropertyValueType): boolean {
  let returnSpec;
  if (_.isFunction(cfnFn.returnSpec)) {
    returnSpec = cfnFn.returnSpec();
  } else {
    returnSpec = cfnFn.returnSpec;
  }
  // Test the returnSpec is a superset of spec. This it to support testing
  // { Type: 'List' } without checking the ItemType.
  // I can't explain why this works, but https://stackoverflow.com/a/26127030
  return _.some([returnSpec], spec);
}

// Used to short-circuit validation checks. For example:
//
//  validate.optional(value) && validate.string(value);
//
export function optional(path: Path, o: any, errors: Error[]): boolean {
  return !_.isUndefined(o);
}

export function required(path: Path, o: any, errors: Error[]): boolean {
  if (_.isNil(o) || isNoValue(o)) {
    errors.push({ path, message: 'is required' });
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
  errors: Error[],
  properties: { [key: string]: ValidationFn[] } = {}): boolean {
  if (_.isPlainObject(o)) {
    // Validate the objects properties
    _.forEach(properties, (fns, key) => {
      const p = path.concat(key);
      _.find(fns, (fn) => !fn(p, _.get(o, key), errors));
    });
    return true;
  } else {
    errors.push({ path, message: 'must be an Object' });
    return false;
  }
}

export function list(path: Path, o: any, errors: Error[]): o is Array<any> {
  if (o instanceof yaml.CfnFn && cfnFn(o, { Type: 'List' })) {
    return true
  } else if (_.isArray(o)) {
    return true;
  } else {
    errors.push({ path, message: `must be a List, got ${JSON.stringify(o)}` });
    return false;
  }
}

export function string(path: Path, o: any, errors: Error[]): boolean {
  if (o instanceof yaml.CfnFn
    && (cfnFn(o, { PrimitiveType: 'String' }) || cfnFn(o, { PrimitiveType: 'Number' }))) {
    return true;
  } else if (_.isString(o)) {
    return true;
  } else if (_.isBoolean(o)) { // TODO better support 'true'/'false' in string values
    return true;
  } else if (_.isNumber(o)) { // YAML interprets number only strings as numbers
    return true;
  } else {
    errors.push({ path, message: `must be a String, got ${JSON.stringify(o)}` });
    return false;
  }
}

export function number(path: Path, o: any, errors: Error[]): boolean {
  if (_.isNumber(o)) {
    return true;
  } else if (_.isString(o) && _.isFinite(_.parseInt(o))) {
    return true;
  } else {
    errors.push({ path, message: 'must be a Number' });
    return false;
  }
}

export function boolean(path: Path, o: any, errors: Error[]): boolean {
  if (o instanceof yaml.CfnFn && cfnFn(o, { PrimitiveType: 'Boolean' })) {
    return true;
  } else if (_.isBoolean(o)) {
    return true;
  } else if (_.isString(o) && o.match(/^(true|false)$/i)) {
    return true;
  } else {
    errors.push({ path, message: `must be a Boolean, got ${JSON.stringify(o)}` });
    return false;
  }
}

export class Validator extends Visitor {
  protected errors: Error[];

  constructor(errors: Error[]) {
    super();
    this.errors = errors;
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

function primitiveType(path: Path, primitiveType: PrimitiveType, property: any, errors: Error[]) {
  let validator: (path: Path, o: any, errors: Error[]) => boolean;
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
  validator.call(undefined, path, property, errors);
}

function complexType(path: Path, resourceType: string, type: Type, properties: any, errors: Error[]) {
  // TODO check that resourceType is valid
  const propertyType = _.get(PropertyTypes, `${resourceType}.${type}`) || _.get(PropertyTypes, type);
  if (propertyType) {
    if (object(path, properties, errors)) {
      forEachWithPath(path, properties, (path, property, name) => {
        const s = _.get(propertyType.Properties, name);
        if (s) {
          if (s.PrimitiveType) {
            primitiveType(path, s.PrimitiveType, property, errors);
          } else if (s.Type === 'Map') {
            object(path, property, errors);
          } else if (s.Type === 'List') {
            if (list(path, property, errors)) {
              forEachWithPath(path, property, (path, v, k) => {
                if (s.PrimitiveItemType) {
                  primitiveType(path, s.PrimitiveItemType, v, errors);
                } else if (s.ItemType) {
                  complexType(path, resourceType, s.ItemType, v, errors);
                } else {
                  throw new ResourceSpecificationError(`Unknown List Type '${s.PrimitiveItemType}'`, path)
                }
              });
            }
          }
        } else {
          errors.push({ path, message: 'invalid property' });
        }
      });
    }
  } else {
    throw new ResourceSpecificationError(`Unknown Type '${propertyType}'`, path);
  }
}

export function spec(path: Path, resourceType: string, propertyType: PropertyValueType, property: any, errors: Error[]) {
  if (propertyType.PrimitiveType) {
    primitiveType(path, propertyType.PrimitiveType, property, errors);
  } else if (propertyType.Type === 'Map') {
    object(path, property, errors);
  } else if (propertyType.Type === 'List') {
    if (list(path, property, errors)) {
      forEachWithPath(path, property, (path, v, i) => {
        if (propertyType.PrimitiveItemType) {
          primitiveType(path, propertyType.PrimitiveItemType, v, errors);
        } else if (propertyType.ItemType) {
          complexType(path, resourceType, propertyType.ItemType, v, errors);
        } else {
          throw new ResourceSpecificationError('No property type', path);
        }
      });
    }
  } else if (propertyType.Type) {
    complexType(path, resourceType, propertyType.Type, property, errors);
  } else {
    throw new ResourceSpecificationError('No property type', path);
  }
}
