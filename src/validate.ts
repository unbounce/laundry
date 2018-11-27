import * as _ from 'lodash';

import {Visitor} from './ast';
import {Path, Error} from './types';

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
  if(!_.isObject(o)) {
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
  if(!_.isString(o)) {
    errors.push({path, message: 'must be a String'});
    return false;
  } else {
    return true;
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


  protected forEachWithPath<T>(path: Path, as: Array<T>, fn: (path: Path, a: T, i: number|string) => void): void {
    _.forEach(as, (a, i) => {
      fn(path.concat(i.toString()), a, i);
    });
  }

}
