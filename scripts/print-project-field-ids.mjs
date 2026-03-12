import { spawnSync } from "node:child_process";
import process from "node:process";
import {
  buildVariableEntries,
  formatGhVariableCommands,
  formatVariableLines
} from "./lib/project-field-report.mjs";

function parseArguments(argv) {
  const options = {
    projectId: process.env.PROJECT_ID ?? "",
    repository: process.env.PROJECT_REPOSITORY_NAME ?? process.env.GITHUB_REPOSITORY ?? "",
    json: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    switch (token) {
      case "--project-id":
        options.projectId = argv[index + 1] ?? options.projectId;
        index += 1;
        break;
      case "--repo":
        options.repository = argv[index + 1] ?? options.repository;
        index += 1;
        break;
      case "--json":
        options.json = true;
        break;
      default:
        break;
    }
  }

  if (!options.projectId) {
    throw new Error("請提供 --project-id <project-id> 或設定 PROJECT_ID");
  }

  if (!options.repository) {
    throw new Error("請提供 --repo <owner/repo> 或設定 PROJECT_REPOSITORY_NAME");
  }

  return options;
}

function runGh(argumentsList) {
  const result = spawnSync("gh", argumentsList, {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"]
  });

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || "gh 指令失敗");
  }

  return result.stdout.trim();
}

function compactQuery(query) {
  return query.replace(/\s+/g, " ").trim();
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const query = `
    query GetProjectFields($projectId: ID!) {
      node(id: $projectId) {
        ... on ProjectV2 {
          id
          title
          fields(first: 50) {
            nodes {
              ... on ProjectV2Field {
                id
                name
                dataType
              }
              ... on ProjectV2SingleSelectField {
                id
                name
                dataType
                options {
                  id
                  name
                }
              }
              ... on ProjectV2IterationField {
                id
                name
                dataType
              }
            }
          }
        }
      }
    }
  `;

  const output = runGh([
    "api",
    "graphql",
    "--raw-field",
    `query=${compactQuery(query)}`,
    "-F",
    `projectId=${options.projectId}`
  ]);

  const parsed = JSON.parse(output);
  const project = parsed.data?.node;

  if (!project) {
    throw new Error("找不到指定的 GitHub Project");
  }

  const fields = project.fields.nodes.map((field) => ({
    id: field.id,
    name: field.name,
    dataType: field.dataType,
    options: field.options ?? []
  }));

  const variableEntries = buildVariableEntries(project.id, options.repository, fields);
  const report = {
    projectId: project.id,
    projectTitle: project.title,
    repository: options.repository,
    fields,
    variables: Object.fromEntries(variableEntries)
  };

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log(`# Project: ${project.title}`);
  console.log(`# Project ID: ${project.id}`);
  console.log("");
  console.log("## Fields");

  for (const field of fields) {
    console.log(`- ${field.name} (${field.dataType}) => ${field.id}`);

    if (field.options.length > 0) {
      for (const option of field.options) {
        console.log(`  - option: ${option.name} => ${option.id}`);
      }
    }
  }

  console.log("");
  console.log("## GitHub Variables");
  console.log(formatVariableLines(variableEntries));
  console.log("");
  console.log("## gh variable set Commands");
  console.log(formatGhVariableCommands(variableEntries, options.repository));
}

await main();
