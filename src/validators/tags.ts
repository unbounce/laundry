import * as _ from 'lodash';

import * as validate from '../validate';
import * as yaml from '../yaml';
import {Validator} from '../validate';
import {Path, Error} from '../types';
import {ResourceTypes, Attributes} from '../spec';

function tagName(tag: yaml.Tag<any>) {
  return tag.constructor.name;
}

export class TagsValidator extends Validator {
  stack: yaml.Tag<any>[] = [];

  ResourceProperty(path: Path, name: string, value: any) {
    if(value instanceof yaml.Tag) {
      this.Tag(path.concat(tagName(value)), value);
    }
  }

  Tag(path: Path, tag: yaml.Tag<any>) {
    _.forEach(this.stack, (tag) => {
      if(!_.includes(tag.supportedFns, tag.constructor)) {
        this.errors.push({ path, message: `can not be used within ${tagName(tag)}`});
      }
    });

    if(tag.paramSpec) {
      const paramErrors: Error[] = [];
      _.forEach(tag.paramSpec, (spec) => {
        validate.spec(path, spec, tag.data, paramErrors);
      });
      // If no specs passed
      if(tag.paramSpec.length === paramErrors.length) {
        this.errors.push({
          path,
          message: _.join(_.map(paramErrors, (e) => e.message), ' or ')
        })
      }
    }

    if(tag.data instanceof yaml.Tag) {
      this.stack.push(tag);
      this.Tag(path.concat(tagName(tag.data)), tag.data);
      this.stack.pop();
    }
  }
}
