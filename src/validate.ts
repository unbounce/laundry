import * as _ from 'lodash';

import {Visitor} from './ast';
import {Path, Error, ResourceSpecificationError} from './types';
import {
  PropertyTypes,
  PropertyValueType,
  PrimitiveType,
  Type
} from './spec';
import * as yaml from './yaml';
import {forEachWithPath} from './util';

export function cfnFn(tag: yaml.CfnFn<any>, spec: PropertyValueType): boolean {
  return _.isEqual(spec, tag.returnSpec);
}

export function optional(o: any): boolean {
  // Used to short-circuit validation checks
  return !_.isUndefined(o);
}

export function required(path: Path, o: any, errors: Error[]): boolean {
   if(_.isNil(o)) {
    errors.push({path, message: 'is required'});
    return false;
  } else {
    return true;
  }
}

export function object(path: Path, o: any, errors: Error[]): boolean {
  if(!_.isPlainObject(o)) {
    errors.push({path, message: 'must be an Object'});
    return false;
  } else {
    return true;
  }
}

export function list(path: Path, o: any, errors: Error[]): boolean {
   if(!_.isArray(o)) {
    errors.push({path, message: 'must be a List'});
    return false;
  } else {
    return true;
  }
}

export function string(path: Path, o: any, errors: Error[]): boolean {
  if(o instanceof yaml.CfnFn && cfnFn(o, { PrimitiveType: 'String' })) {
    return true;
  } else if (_.isString(o)) {
    return true;
  } else {
    errors.push({path, message: 'must be a String'});
    return false;
  }
}

export function number(path: Path, o: any, errors: Error[]): boolean {
  if(!_.isNumber(o)) {
    errors.push({path, message: 'must be a Number'});
    return false;
  } else {
    return true;
  }
}

export function boolean(path: Path, o: any, errors: Error[]): boolean {
  if(!_.isBoolean(o)) {
    errors.push({path, message: 'must be a Boolean'});
    return false;
  } else {
    return true;
  }
}

export function error(path: Path, message: string, errors: Error[]): void {
  errors.push({path, message});
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
    fn: (path: Path, a: T, i: number|string) => void)
  : void {
    _.forEach(as, (a, i) => {
      fn(path.concat(i.toString()), a, i);
    });
  }

}

export function primitiveType(path: Path, primitiveType: PrimitiveType, property: any, errors: Error[]) {
  let predicate: (path: Path, o: any, errors: Error[]) => boolean;
  switch(primitiveType) {
    case 'Boolean':
      predicate = boolean;
      break;
    case 'Double':
      predicate = number;
      break;
    case 'Integer':
      predicate = number;
      break;
    case 'Json':
      predicate = object;
      break;
    case 'Long':
      predicate = number;
      break;
    case 'String':
      predicate = string;
      break;
    case 'Timestamp':
      predicate = string; // TODO better check
    default:
      throw new ResourceSpecificationError('Unknown PrimitiveType');
  }
  predicate.call(undefined, path, property, errors);
}

export function complexType(path: Path, type: Type, properties: any, errors: Error[]) {
  const propertyType = _.get(PropertyTypes, type);
   if(propertyType) {
     if(object(path, properties, errors)) {
       forEachWithPath(path, properties, (path, property, name) => {
        const s = _.get(propertyType.Properties, name);
         if(s) {
           if(s.PrimitiveItemType) {
             primitiveType(path, s.PrimitiveItemType, property, errors);
          } else  if(s.Type === 'List') {
             if(_.isArray(property)) {
               forEachWithPath(path, property, (path, v, k) => {
                if(s.PrimitiveItemType) {
                  primitiveType(path, s.PrimitiveItemType, v, errors);
                } else  if(s.ItemType) {
                  complexType(path, s.ItemType, v, errors);
                } else {
                  throw new ResourceSpecificationError('Unknown List Type')
                }
              });
            } else {
              errors.push({path, message: 'must be a List'});
            }
          }
        } else {
          errors.push({path, message: 'invalid property'});
        }
      });
    }
  } else {
    throw new ResourceSpecificationError('Unknown Type');
  }
}

export function spec(path: Path, propertyType: PropertyValueType, property: any, errors: Error[]) {
  if(propertyType.PrimitiveType) {
    primitiveType(path, propertyType.PrimitiveType, property, errors);
  } else if(propertyType.Type === 'List') {
    if(_.isArray(property)) {
      forEachWithPath(path, property, (path, v, i) => {
        if(propertyType.PrimitiveItemType) {
          primitiveType(path, propertyType.PrimitiveItemType, v, errors);
        } else if(propertyType.ItemType) {
          complexType(path, propertyType.ItemType, v, errors);
        } else {
          throw new ResourceSpecificationError('No property type');
        }
      });
    } else {
      errors.push({ path, message: 'must be a List'});
    }
  } else if(propertyType.Type) {
    complexType(path, propertyType.Type, property, errors);
  } else {
    throw new ResourceSpecificationError('No property type');
  }
}
