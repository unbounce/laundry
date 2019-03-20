export type Path = string[];

export type Error = {
  path: Path,
  message: string,
  source?: string,
  value?: string,
};

export class ResourceSpecificationError extends Error {
  constructor(message: string, path: string[]) {
    super(`${message} at ${path.join('.')} - there may be an error in the CloudFormation Resource Specification`);
  }
}
