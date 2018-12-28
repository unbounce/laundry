import * as _ from 'lodash';

import * as validate from '../validate';
import * as yaml from '../yaml';
import { Validator } from '../validate';
import { Path, Error } from '../types';
import { cfnFnName } from '../util';

type SupportedFns = { [key: string]: yaml.CfnFn[] | SupportedFns };

// SUPPORTED_FNS is used as the key on `CfnFnsValidator#supportedFns` instead of
// just assigning the cfnFn's support functions to it's `path` to allow for
// children functions to be nested within that key as well.
const SUPPORTED_FNS = '__SUPPORTED_FNS__';
const FN_NAME = '__FN_NAME__';

export default class CfnFnsSupportedFnsValidator extends Validator {
  supportedFns: SupportedFns = {};

  CfnFn(path: Path, propertyName: string, cfnFn: yaml.CfnFn) {
    // Iterate over each segment of the path to determine if we're nested within
    // any functions that would not allow this ${cfnFn} to be used here
    _.reduce(path, (currentPath: string[], p: string) => {

      // We're looking at:
      //  - [Root, SUPPORTED_FNS]
      //  - [Root, Resources, SUPPORTED_FNS]
      //  - [Root, Resources, A, SUPPORTED_FNS], etc
      currentPath.push(p);
      const supportedFns = _.get(this.supportedFns, currentPath.concat(SUPPORTED_FNS));

      if (_.isArray(supportedFns)) {
        if (!_.includes(supportedFns, cfnFn.constructor)) {
          const fnName = _.get(this.supportedFns, currentPath.concat(FN_NAME))
          this.errors.push({ path, message: `can not be used within ${fnName}` });
        }
      }
      return currentPath;
    }, []);

    // Update supportedFns so that we can check any nested functions
    _.set(this.supportedFns, path.concat(SUPPORTED_FNS), cfnFn.supportedFns);
    _.set(this.supportedFns, path.concat(FN_NAME), cfnFnName(cfnFn));
  }
}
