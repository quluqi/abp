import { experimental, strings, workspaces } from '@angular-devkit/core';
import { SchematicsException, Tree } from '@angular-devkit/schematics';
import { Exception } from '../enums';
import { Project } from '../models';
import { getWorkspace, ProjectType } from './angular';
import { findEnvironmentExpression } from './ast';
import { readFileInTree } from './common';

export function isLibrary(project: workspaces.ProjectDefinition): boolean {
  return project.extensions['projectType'] === ProjectType.Library;
}

export function readEnvironment(tree: Tree, project: workspaces.ProjectDefinition) {
  if (isLibrary(project)) return undefined;

  const srcPath = project.sourceRoot || `${project.root}/src`;
  const envPath = srcPath + '/environments/environment.ts';
  const source = readFileInTree(tree, envPath);
  return findEnvironmentExpression(source);
}

export function readWorkspaceSchema(tree: Tree) {
  const workspaceBuffer = tree.read('/angular.json') || tree.read('/workspace.json');
  if (!workspaceBuffer) throw new SchematicsException(Exception.NoWorkspace);

  let workspaceSchema: experimental.workspace.WorkspaceSchema;

  try {
    workspaceSchema = JSON.parse(workspaceBuffer.toString());
  } catch (_) {
    throw new SchematicsException(Exception.InvalidWorkspace);
  }

  return workspaceSchema;
}

export async function resolveProject(tree: Tree, name: string): Promise<Project> {
  name = name || readWorkspaceSchema(tree).defaultProject!;
  const workspace = await getWorkspace(tree);
  let definition: Project['definition'] | undefined;

  try {
    definition = workspace.projects.get(name);
  } catch (_) {}

  if (!definition)
    try {
      name = strings.dasherize(name);
      definition = workspace.projects.get(name);
    } catch (_) {}

  if (!definition)
    try {
      name = strings.camelize(name);
      definition = workspace.projects.get(name);
    } catch (_) {}

  if (!definition)
    try {
      name = strings.classify(name);
      definition = workspace.projects.get(name);
    } catch (_) {}

  if (!definition) throw new SchematicsException(Exception.NoProject);

  return { name, definition };
}
