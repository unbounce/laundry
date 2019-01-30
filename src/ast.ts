import * as _ from 'lodash';

import { Path } from './types';
import { CfnFn } from './yaml';
import { cfnFnName } from './util';

export class Visitor {
  Root(path: Path, root: any): void { }
  AWSTemplateFormatVersion(path: Path, version: any): void { }
  Description(path: Path, description: any): void { }
  Metadata(path: Path, metadata: any): void { }
  Parameters(path: Path, parameters: any): void { }
  Mappings(path: Path, mappings: any): void { }
  Conditions(path: Path, conditions: any): void { }
  Transform(path: Path, transform: any): void { }
  Resources(path: Path, resources: any): void { }
  Outputs(path: Path, outputs: any): void { }
  Parameter(path: Path, parameter: any): void { }
  Mapping(path: Path, mapping: any): void { }
  Condition(path: Path, condition: any): void { }
  Resource(path: Path, resource: any): void { }
  ResourceProperty(path: Path, name: string, value: any): void { }
  CfnFn(path: Path, propertyName: string, value: CfnFn): void { }
  Output(path: Path, output: any): void { }
}

export class Walker {
  private paths: Path[] = [];
  private visitors: Visitor[] = [];

  constructor(visitors: Visitor[]) {
    this.visitors = visitors;
  }

  private pushPath(s: string): Path {
    // Push new path onto the stack without modifying existing one
    const prevPath: string[] = _.get(this.paths, this.paths.length - 1, []);
    const path = prevPath.concat(s);
    this.paths.push(path);
    return path;
  }

  private popPath() {
    // Return to the previous path in the stack
    this.paths.pop();
  }

  Root(root: object): void {
    const path = this.pushPath('Root');
    _.forEach(this.visitors, (v) => v.Root(path, root));

    this.AWSTemplateFormatVersion(_.get(root, 'AWSTemplateFormatVersion'));
    this.Description(_.get(root, 'Description'));
    this.Metadata(_.get(root, 'Metadata'));
    this.Parameters(_.get(root, 'Parameters'));
    this.Mappings(_.get(root, 'Mappings'));
    this.Conditions(_.get(root, 'Conditions'));
    this.Transform(_.get(root, 'Transform'));
    this.Resources(_.get(root, 'Resources'));
    this.Outputs(_.get(root, 'Outputs'));

    this.popPath();
  }

  AWSTemplateFormatVersion(version: any): void {
    const path = this.pushPath('AWSTemplateFormatVersion');
    _.forEach(this.visitors, (v) => v.AWSTemplateFormatVersion(path, version));
    this.popPath();
  }

  Description(description: any): void {
    const path = this.pushPath('Description');
    _.forEach(this.visitors, (v) => v.Description(path, description));
    this.popPath();
  }

  Metadata(metadata: any): void {
    const path = this.pushPath('Metadata');
    _.forEach(this.visitors, (v) => v.Metadata(path, metadata));
    this.popPath();
  }

  Parameters(parameters: any): void {
    const path = this.pushPath('Parameters');
    _.forEach(this.visitors, (v) => v.Parameters(path, parameters));

    if (_.isObject(parameters)) {
      _.forEach(parameters, (parameter, name) => {
        this.pushPath(name);
        _.forEach(this.visitors, (v) => v.Parameter(path, parameter));
        this.popPath();
      });
    }
    this.popPath();
  }

  Mappings(mappings: any): void {
    const path = this.pushPath('Mappings');
    _.forEach(this.visitors, (v) => v.Mappings(path, mappings));
    if (_.isObject(mappings)) {
      _.forEach(mappings, (mapping, name) => {
        const path = this.pushPath(name);
        _.forEach(this.visitors, (v) => v.Mapping(path, mapping));
        this.popPath();
      });
    }
    this.popPath();
  }

  Conditions(conditions: any): void {
    const path = this.pushPath('Conditions');
    _.forEach(this.visitors, (v) => v.Conditions(path, conditions));
    if (_.isPlainObject(conditions)) {
      _.forEach(conditions, (condition, name) => {
        const path = this.pushPath(name);
        _.forEach(this.visitors, (v) => v.Condition(path, condition));
        this.recursivelyVisitCfnFn(path, '', condition);
        this.popPath();
      });
    }
    this.popPath();
  }

  Transform(transform: any): void {
    const path = this.pushPath('Transform');
    _.forEach(this.visitors, (v) => v.Transform(path, transform));
    this.popPath();
  }

  Resources(resources: any): void {
    const path = this.pushPath('Resources');
    _.forEach(this.visitors, (v) => v.Resources(path, resources));

    if (_.isObject(resources)) {
      _.forEach(resources, (resource, name) => {
        const path = this.pushPath(name);
        _.forEach(this.visitors, (v) => v.Resource(path, resource));
        const properties = _.get(resource, 'Properties');
        if (_.isObject(properties)) {
          const path = this.pushPath('Properties');
          _.forEach(properties, (value, key) => {
            const path = this.pushPath(key);
            this.recursivelyVisitProperty(path, key, value);
            this.recursivelyVisitCfnFn(path, key, value);
            this.popPath();
          });
          this.popPath();
        }
        this.popPath();
      });
    }

    this.popPath();
  }

  private recursivelyVisitProperty(path: Path, name: string, value: any) {
    _.forEach(this.visitors, (v) => v.ResourceProperty(path, name, value));
    if (_.isObject(value) && !(value instanceof CfnFn)) {
      _.forEach(value, (v, k) => {
        const key = k.toString();
        path = this.pushPath(key);
        this.recursivelyVisitProperty(path, key, v);
        this.popPath();
      });
    }
  }

  // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference.html
  //
  // You can use intrinsic functions only in specific parts of a template.
  // Currently, you can use intrinsic functions in resource properties, outputs,
  // metadata attributes, and update policy attributes.
  private recursivelyVisitCfnFn(path: Path, name: string, value: any) {
    if (value instanceof CfnFn) {
      path = this.pushPath(cfnFnName(value));
      _.forEach(this.visitors, (v) => v.CfnFn(path, name, value));
      this.recursivelyVisitCfnFn(path, name, value.data);
      this.popPath();
    } else if (_.isObject(value)) {
      _.forEach(value, (v, i) => {
        path = this.pushPath(i.toString());
        this.recursivelyVisitCfnFn(path, name, v);
        this.popPath();
      });
    }
  }

  Outputs(outputs: any): void {
    const path = this.pushPath('Outputs');
    _.forEach(this.visitors, (v) => v.Outputs(path, outputs));
    if (_.isObject(outputs)) {
      _.forEach(outputs, (output, name) => {
        const path = this.pushPath(name);
        _.forEach(this.visitors, (v) => v.Output(path, output));
        this.popPath();
      });
    }
    this.popPath();
  }
}
