export type Path = string[];

export type Error = {
  path: Path,
  message: String
};

export class ResourceSpecificationError extends Error {
  constructor(message: string) {
    super(`${message} - there may be an error in the CloudFormation Resource Specification`);
  }
}
