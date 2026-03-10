#!/usr/bin/env node
// MCP Token Gateway Compression Benchmark
// Collects tool definitions from 25+ real MCP servers and measures compression

const https = require('https');
const http = require('http');
const fs = require('fs');

const COMPRESS_URL = 'https://gateway.toolboxlite.com/api/test-compress';
const API_KEY = 'mtg_834c93bd7e074de9b60962c4bbba9bbd174f7ca7';
const PROXY_BASE = `https://gateway.toolboxlite.com/proxy/${API_KEY}`;

// ═══════════════════════════════════════════════════════════════
// REAL MCP SERVER TOOL DEFINITIONS (from official docs/READMEs)
// ═══════════════════════════════════════════════════════════════

const servers = [
  // ── SMALL (3-5 tools) ──
  {
    name: "Context7",
    source: "context7.com",
    category: "Documentation",
    stars: "4.2k",
    live: "https://mcp.context7.com/mcp",
    tools: null // will fetch live
  },
  {
    name: "DeepWiki",
    source: "deepwiki.com",
    category: "Documentation",
    stars: "6.5k",
    live: "https://mcp.deepwiki.com/mcp",
    tools: null
  },
  {
    name: "Brave Search",
    source: "modelcontextprotocol/servers",
    category: "Search",
    stars: "80k",
    tools: [
      {"name":"brave_web_search","description":"Performs a web search using the Brave Search API, ideal for general queries, news, articles, and online content. Use this for broad information gathering, recent events, or when you need diverse web sources. Supports pagination, content filtering, and freshness controls. Maximum 20 results per request.","inputSchema":{"type":"object","properties":{"query":{"type":"string","description":"Search query (max 400 chars, 50 words)"},"count":{"type":"number","description":"Number of results (1-20, default 10)"},"offset":{"type":"number","description":"Pagination offset (max 9, default 0)"},"freshness":{"type":"string","description":"Filter by time: pd (past day), pw (past week), pm (past month)","enum":["pd","pw","pm"]},"text_decorations":{"type":"boolean","description":"Include bold/italic decorations in snippets"},"safe_search":{"type":"string","description":"Content filter level","enum":["off","moderate","strict"]}},"required":["query"]}},
      {"name":"brave_local_search","description":"Searches for local businesses and places using Brave's Local Search API. Best for queries related to physical locations, businesses, restaurants, services, and points of interest. Returns detailed information including business names, addresses, phone numbers, ratings, and operating hours. Use this when the query implies local search intent or mentions specific locations. Falls back to web search if no local results found.","inputSchema":{"type":"object","properties":{"query":{"type":"string","description":"Local search query"},"count":{"type":"number","description":"Number of results (1-20, default 5)"}},"required":["query"]}}
    ]
  },
  {
    name: "Sequential Thinking",
    source: "modelcontextprotocol/servers",
    category: "Reasoning",
    stars: "80k",
    tools: [
      {"name":"sequentialthinking","description":"A detailed tool for dynamic and reflective problem-solving through a structured thinking process. This tool helps break down complex problems into manageable steps, supports revision of previous thoughts, and enables branching into alternative paths of reasoning. Each thought can build on, revise, or branch from previous thoughts. The total number of thoughts can be adjusted as the problem-solving process unfolds, and the process is considered complete when isComplete is true.","inputSchema":{"type":"object","properties":{"thought":{"type":"string","description":"The current thinking step, which can be an observation, analysis, hypothesis, verification, or conclusion. Each thought should be a clear, complete statement that advances the problem-solving process."},"nextThoughtNeeded":{"type":"boolean","description":"Whether another thinking step is needed after this one. Set to false when the thinking process is complete."},"thoughtNumber":{"type":"integer","description":"The current thought number in the sequence, starting from 1. This helps track progress through the thinking process.","minimum":1},"totalThoughts":{"type":"integer","description":"The estimated total number of thoughts needed to solve the problem. This can be revised as the thinking process evolves.","minimum":1},"isRevision":{"type":"boolean","description":"Whether this thought is a revision of a previous thought. Revisions allow for correcting or refining earlier reasoning."},"revisesThought":{"type":"integer","description":"If this is a revision, the number of the thought being revised.","minimum":1},"branchFromThought":{"type":"integer","description":"If branching, the thought number to branch from. Branching creates an alternative path of reasoning.","minimum":1},"branchId":{"type":"string","description":"A unique identifier for the current branch of thinking, helping to track different lines of reasoning."},"needsMoreThoughts":{"type":"boolean","description":"Whether more thoughts are needed beyond the current estimate. This triggers expansion of the thinking process."}},"required":["thought","nextThoughtNeeded","thoughtNumber","totalThoughts"]}}
    ]
  },
  {
    name: "Time",
    source: "modelcontextprotocol/servers",
    category: "Utility",
    stars: "80k",
    tools: [
      {"name":"get_current_time","description":"Get the current time in a specific timezone or UTC. This tool returns the current date and time, formatted in ISO 8601 format with timezone information. Use this when you need to know the current time in any location.","inputSchema":{"type":"object","properties":{"timezone":{"type":"string","description":"IANA timezone name (e.g., 'America/New_York', 'Europe/London', 'Asia/Tokyo'). Defaults to UTC if not specified."}},"required":[]}},
      {"name":"convert_time","description":"Convert time between timezones. This tool takes a time in one timezone and converts it to another timezone. Both source and target timezones are specified using IANA timezone names. The input time should be in ISO 8601 format.","inputSchema":{"type":"object","properties":{"source_timezone":{"type":"string","description":"Source IANA timezone name"},"time":{"type":"string","description":"Time to convert in ISO 8601 format (e.g., '2024-01-01T12:00:00')"},"target_timezone":{"type":"string","description":"Target IANA timezone name"}},"required":["source_timezone","time","target_timezone"]}}
    ]
  },
  {
    name: "Memory (Knowledge Graph)",
    source: "modelcontextprotocol/servers",
    category: "Knowledge",
    stars: "80k",
    tools: [
      {"name":"create_entities","description":"Create multiple new entities in the knowledge graph. Each entity has a name, type, and list of observations. Entities are the core nodes in the knowledge graph that represent concepts, people, places, or things. If an entity with the same name already exists, it will be updated with the new observations.","inputSchema":{"type":"object","properties":{"entities":{"type":"array","items":{"type":"object","properties":{"name":{"type":"string","description":"The name of the entity"},"entityType":{"type":"string","description":"The type of the entity (e.g., 'person', 'organization', 'concept')"},"observations":{"type":"array","items":{"type":"string"},"description":"An array of observation strings about the entity"}},"required":["name","entityType","observations"]}}},"required":["entities"]}},
      {"name":"create_relations","description":"Create multiple new relations between entities in the knowledge graph. Relations define how entities are connected to each other. Each relation has a source entity, a relation type, and a target entity.","inputSchema":{"type":"object","properties":{"relations":{"type":"array","items":{"type":"object","properties":{"from":{"type":"string","description":"The name of the source entity"},"relationType":{"type":"string","description":"The type of relation (e.g., 'works_at', 'knows', 'located_in')"},"to":{"type":"string","description":"The name of the target entity"}},"required":["from","relationType","to"]}}},"required":["relations"]}},
      {"name":"add_observations","description":"Add new observations to existing entities in the knowledge graph. Observations are facts or notes about an entity that provide additional context and information.","inputSchema":{"type":"object","properties":{"observations":{"type":"array","items":{"type":"object","properties":{"entityName":{"type":"string","description":"The name of the entity to add observations to"},"contents":{"type":"array","items":{"type":"string"},"description":"The observations to add"}},"required":["entityName","contents"]}}},"required":["observations"]}},
      {"name":"delete_entities","description":"Delete multiple entities and their associated relations from the knowledge graph. This permanently removes the specified entities and any relations where they appear as source or target.","inputSchema":{"type":"object","properties":{"entityNames":{"type":"array","items":{"type":"string"},"description":"The names of the entities to delete"}},"required":["entityNames"]}},
      {"name":"delete_observations","description":"Delete specific observations from entities in the knowledge graph. This removes individual observations without deleting the entire entity.","inputSchema":{"type":"object","properties":{"deletions":{"type":"array","items":{"type":"object","properties":{"entityName":{"type":"string","description":"The name of the entity"},"observations":{"type":"array","items":{"type":"string"},"description":"The observations to delete"}},"required":["entityName","observations"]}}},"required":["deletions"]}},
      {"name":"delete_relations","description":"Delete multiple relations from the knowledge graph. This removes the specified connections between entities without affecting the entities themselves.","inputSchema":{"type":"object","properties":{"relations":{"type":"array","items":{"type":"object","properties":{"from":{"type":"string","description":"The name of the source entity"},"relationType":{"type":"string","description":"The type of relation"},"to":{"type":"string","description":"The name of the target entity"}},"required":["from","relationType","to"]}}},"required":["relations"]}},
      {"name":"read_graph","description":"Read the entire knowledge graph, including all entities, their observations, and the relations between them. This returns the complete state of the graph as a structured object.","inputSchema":{"type":"object","properties":{}}},
      {"name":"search_nodes","description":"Search for nodes in the knowledge graph based on a query string. This performs a fuzzy search across entity names, types, and observations. Returns matching entities and their relations.","inputSchema":{"type":"object","properties":{"query":{"type":"string","description":"Search query to match against entity names, types, and observations"}},"required":["query"]}},
      {"name":"open_nodes","description":"Retrieve specific nodes from the knowledge graph by their exact names. This returns the complete entity information including observations and relations for the specified nodes.","inputSchema":{"type":"object","properties":{"names":{"type":"array","items":{"type":"string"},"description":"The exact names of the entities to retrieve"}},"required":["names"]}}
    ]
  },
  {
    name: "Fetch",
    source: "modelcontextprotocol/servers",
    category: "Web",
    stars: "80k",
    tools: [
      {"name":"fetch","description":"Fetches a URL from the internet and extracts its contents as markdown. This tool can retrieve web pages, APIs, and other online resources. It converts HTML content to readable markdown format, making it easy to process and understand web content. The tool respects robots.txt rules and includes configurable timeouts and content size limits.","inputSchema":{"type":"object","properties":{"url":{"type":"string","description":"URL to fetch"},"max_length":{"type":"integer","description":"Maximum number of characters to return (default: 5000)","default":5000},"start_index":{"type":"integer","description":"Start content at this character index (for pagination)","default":0},"raw":{"type":"boolean","description":"Get raw content without markdown conversion","default":false}},"required":["url"]}}
    ]
  },
  // ── MEDIUM (10-20 tools) ──
  {
    name: "GitHub",
    source: "modelcontextprotocol/servers",
    category: "Version Control",
    stars: "80k",
    tools: [
      {"name":"create_or_update_file","description":"Create or update a single file in a GitHub repository. If the file exists, it will be updated; if not, it will be created. You must provide the file content and a commit message. For binary files, provide base64-encoded content.","inputSchema":{"type":"object","properties":{"owner":{"type":"string","description":"Repository owner (username or organization)"},"repo":{"type":"string","description":"Repository name"},"path":{"type":"string","description":"Path where to create/update the file"},"content":{"type":"string","description":"Content of the file"},"message":{"type":"string","description":"Commit message"},"branch":{"type":"string","description":"Branch to create/update the file in"},"sha":{"type":"string","description":"SHA of the file being replaced (required for updates)"}},"required":["owner","repo","path","content","message","branch"]}},
      {"name":"search_repositories","description":"Search for GitHub repositories based on various criteria. Returns repository information including full name, description, URL, stars, forks, and language. Results are paginated with configurable page size.","inputSchema":{"type":"object","properties":{"query":{"type":"string","description":"Search query using GitHub search syntax"},"page":{"type":"number","description":"Page number for pagination (default: 1)"},"perPage":{"type":"number","description":"Results per page (max 100, default: 30)"}},"required":["query"]}},
      {"name":"create_issue","description":"Create a new issue in a GitHub repository. Issues can include a title, body, labels, assignees, and milestone. Markdown formatting is supported in the body.","inputSchema":{"type":"object","properties":{"owner":{"type":"string","description":"Repository owner"},"repo":{"type":"string","description":"Repository name"},"title":{"type":"string","description":"Issue title"},"body":{"type":"string","description":"Issue body (Markdown supported)"},"assignees":{"type":"array","items":{"type":"string"},"description":"Usernames to assign"},"labels":{"type":"array","items":{"type":"string"},"description":"Labels to add"},"milestone":{"type":"number","description":"Milestone number"}},"required":["owner","repo","title"]}},
      {"name":"create_pull_request","description":"Create a new pull request in a GitHub repository. The pull request merges changes from the head branch into the base branch. You can specify a title, body, and whether it should be created as a draft.","inputSchema":{"type":"object","properties":{"owner":{"type":"string","description":"Repository owner"},"repo":{"type":"string","description":"Repository name"},"title":{"type":"string","description":"Pull request title"},"body":{"type":"string","description":"Pull request body"},"head":{"type":"string","description":"The name of the branch where your changes are implemented"},"base":{"type":"string","description":"The name of the branch you want the changes pulled into"},"draft":{"type":"boolean","description":"Whether to create the PR as a draft"},"maintainer_can_modify":{"type":"boolean","description":"Whether maintainers can modify the PR"}},"required":["owner","repo","title","head","base"]}},
      {"name":"fork_repository","description":"Fork a repository to create a copy under your account or a specified organization. Forking allows you to freely experiment with changes without affecting the original project.","inputSchema":{"type":"object","properties":{"owner":{"type":"string","description":"Repository owner"},"repo":{"type":"string","description":"Repository name"},"organization":{"type":"string","description":"Optional: organization to fork to"}},"required":["owner","repo"]}},
      {"name":"create_branch","description":"Create a new branch in a GitHub repository. The branch is created from a specified commit SHA or from the default branch if no SHA is provided.","inputSchema":{"type":"object","properties":{"owner":{"type":"string","description":"Repository owner"},"repo":{"type":"string","description":"Repository name"},"branch":{"type":"string","description":"Name for the new branch"},"from_branch":{"type":"string","description":"Optional: source branch to create from"}},"required":["owner","repo","branch"]}},
      {"name":"list_issues","description":"List and filter issues in a GitHub repository. Supports filtering by state (open/closed), labels, assignee, and sorting options. Results are paginated.","inputSchema":{"type":"object","properties":{"owner":{"type":"string","description":"Repository owner"},"repo":{"type":"string","description":"Repository name"},"state":{"type":"string","enum":["open","closed","all"],"description":"Filter by state"},"labels":{"type":"array","items":{"type":"string"},"description":"Filter by labels"},"sort":{"type":"string","enum":["created","updated","comments"],"description":"Sort field"},"direction":{"type":"string","enum":["asc","desc"],"description":"Sort direction"},"since":{"type":"string","description":"Filter by date (ISO 8601)"},"page":{"type":"number","description":"Page number"},"per_page":{"type":"number","description":"Results per page"}},"required":["owner","repo"]}},
      {"name":"update_issue","description":"Update an existing issue in a GitHub repository. You can modify the title, body, state, labels, assignees, and milestone.","inputSchema":{"type":"object","properties":{"owner":{"type":"string","description":"Repository owner"},"repo":{"type":"string","description":"Repository name"},"issue_number":{"type":"number","description":"Issue number to update"},"title":{"type":"string","description":"New title"},"body":{"type":"string","description":"New body"},"state":{"type":"string","enum":["open","closed"],"description":"New state"},"labels":{"type":"array","items":{"type":"string"},"description":"New labels"},"assignees":{"type":"array","items":{"type":"string"},"description":"New assignees"},"milestone":{"type":"number","description":"New milestone number"}},"required":["owner","repo","issue_number"]}},
      {"name":"add_issue_comment","description":"Add a comment to an existing issue or pull request in a GitHub repository. Comments support Markdown formatting.","inputSchema":{"type":"object","properties":{"owner":{"type":"string","description":"Repository owner"},"repo":{"type":"string","description":"Repository name"},"issue_number":{"type":"number","description":"Issue or PR number"},"body":{"type":"string","description":"Comment body (Markdown supported)"}},"required":["owner","repo","issue_number","body"]}},
      {"name":"search_code","description":"Search for code across GitHub repositories using the GitHub code search syntax. Returns matching code snippets with file paths, repository information, and direct URLs.","inputSchema":{"type":"object","properties":{"q":{"type":"string","description":"Search query using GitHub code search syntax"},"order":{"type":"string","enum":["asc","desc"],"description":"Sort order"},"page":{"type":"number","description":"Page number"},"per_page":{"type":"number","description":"Results per page"}},"required":["q"]}},
      {"name":"search_issues","description":"Search for issues and pull requests across GitHub repositories using GitHub's search syntax. Supports complex queries with qualifiers.","inputSchema":{"type":"object","properties":{"q":{"type":"string","description":"Search query using GitHub search syntax"},"sort":{"type":"string","enum":["comments","reactions","created","updated"],"description":"Sort field"},"order":{"type":"string","enum":["asc","desc"],"description":"Sort order"},"page":{"type":"number","description":"Page number"},"per_page":{"type":"number","description":"Results per page"}},"required":["q"]}},
      {"name":"search_users","description":"Search for GitHub users based on various criteria such as username, location, followers count, and repository count.","inputSchema":{"type":"object","properties":{"q":{"type":"string","description":"Search query using GitHub user search syntax"},"sort":{"type":"string","enum":["followers","repositories","joined"],"description":"Sort field"},"order":{"type":"string","enum":["asc","desc"],"description":"Sort order"},"page":{"type":"number","description":"Page number"},"per_page":{"type":"number","description":"Results per page"}},"required":["q"]}},
      {"name":"get_file_contents","description":"Get the contents of a file or directory from a GitHub repository. For files, returns the content (text or base64 for binary). For directories, returns a listing of contents.","inputSchema":{"type":"object","properties":{"owner":{"type":"string","description":"Repository owner"},"repo":{"type":"string","description":"Repository name"},"path":{"type":"string","description":"Path to the file or directory"},"branch":{"type":"string","description":"Branch name (defaults to repo default branch)"}},"required":["owner","repo","path"]}},
      {"name":"push_files","description":"Push multiple files to a GitHub repository in a single commit. This is more efficient than creating files individually when you need to add or update several files at once.","inputSchema":{"type":"object","properties":{"owner":{"type":"string","description":"Repository owner"},"repo":{"type":"string","description":"Repository name"},"branch":{"type":"string","description":"Branch to push to"},"files":{"type":"array","items":{"type":"object","properties":{"path":{"type":"string"},"content":{"type":"string"}},"required":["path","content"]},"description":"Array of files to push"},"message":{"type":"string","description":"Commit message"}},"required":["owner","repo","branch","files","message"]}},
      {"name":"list_commits","description":"Get a list of commits from a GitHub repository. Supports filtering by SHA/branch, path, author, and date range.","inputSchema":{"type":"object","properties":{"owner":{"type":"string","description":"Repository owner"},"repo":{"type":"string","description":"Repository name"},"sha":{"type":"string","description":"SHA or branch name to list commits from"},"path":{"type":"string","description":"Only commits containing this file path"},"author":{"type":"string","description":"GitHub username or email to filter by"},"since":{"type":"string","description":"Only commits after this date (ISO 8601)"},"until":{"type":"string","description":"Only commits before this date (ISO 8601)"},"page":{"type":"number","description":"Page number"},"per_page":{"type":"number","description":"Results per page"}},"required":["owner","repo"]}}
    ]
  },
  {
    name: "Filesystem",
    source: "modelcontextprotocol/servers",
    category: "File Systems",
    stars: "80k",
    tools: [
      {"name":"read_file","description":"Read the complete contents of a file from the file system. Handles various text encodings and provides detailed error messages if the file cannot be read. Use this tool when you need to examine the contents of a single file. Only works within allowed directories.","inputSchema":{"type":"object","properties":{"path":{"type":"string","description":"Absolute path to the file to read"}},"required":["path"]}},
      {"name":"read_multiple_files","description":"Read the contents of multiple files simultaneously. This is more efficient than reading files one by one when you need to analyze or compare multiple files. Each file's content is returned with its path for easy identification. Failed reads for individual files won't stop the entire operation.","inputSchema":{"type":"object","properties":{"paths":{"type":"array","items":{"type":"string"},"description":"Array of absolute file paths to read"}},"required":["paths"]}},
      {"name":"write_file","description":"Create a new file or completely overwrite an existing file with the provided content. Use with caution as it will overwrite existing files without warning. Creates parent directories if they don't exist. Only works within allowed directories.","inputSchema":{"type":"object","properties":{"path":{"type":"string","description":"Absolute path to write the file"},"content":{"type":"string","description":"Content to write to the file"}},"required":["path","content"]}},
      {"name":"edit_file","description":"Make line-based edits to a text file. Each edit replaces exact line sequences with new content. Returns a git-style diff showing the changes made. Multiple edits can be applied in a single operation, and they are processed sequentially. Best used for precise, surgical modifications to existing files.","inputSchema":{"type":"object","properties":{"path":{"type":"string","description":"Absolute path to the file to edit"},"edits":{"type":"array","items":{"type":"object","properties":{"oldText":{"type":"string","description":"Text to search for (must match exactly)"},"newText":{"type":"string","description":"Text to replace with"}},"required":["oldText","newText"]},"description":"Array of edit operations to apply"},"dryRun":{"type":"boolean","description":"Preview changes without applying them","default":false}},"required":["path","edits"]}},
      {"name":"create_directory","description":"Create a new directory or ensure a directory exists. Can create multiple nested directories in one operation (like mkdir -p). If the directory already exists, this operation succeeds silently. Only works within allowed directories.","inputSchema":{"type":"object","properties":{"path":{"type":"string","description":"Absolute path of the directory to create"}},"required":["path"]}},
      {"name":"list_directory","description":"Get a detailed listing of all files and directories in a specified path. Results clearly distinguish between files and directories with [FILE] and [DIR] prefixes. This tool is essential for understanding project structure and finding specific files.","inputSchema":{"type":"object","properties":{"path":{"type":"string","description":"Absolute path of the directory to list"}},"required":["path"]}},
      {"name":"directory_tree","description":"Get a recursive tree view of files and directories as a JSON structure. Each entry includes 'name', 'type' (file/directory), and 'children' for directories. This provides a comprehensive overview of a project's file organization.","inputSchema":{"type":"object","properties":{"path":{"type":"string","description":"Absolute path of the directory to tree"}},"required":["path"]}},
      {"name":"move_file","description":"Move or rename files and directories. Can move files between directories and rename them in a single operation. If the destination exists, the operation will fail. Works across directories within allowed paths.","inputSchema":{"type":"object","properties":{"source":{"type":"string","description":"Source path"},"destination":{"type":"string","description":"Destination path"}},"required":["source","destination"]}},
      {"name":"search_files","description":"Recursively search for files and directories matching a pattern. Searches through all subdirectories from the starting path. The search is case-insensitive and matches partial names. Returns full paths to all matching items.","inputSchema":{"type":"object","properties":{"path":{"type":"string","description":"Starting directory for the search"},"pattern":{"type":"string","description":"Search pattern to match against file/directory names"},"excludePatterns":{"type":"array","items":{"type":"string"},"description":"Patterns to exclude from search results"}},"required":["path","pattern"]}},
      {"name":"get_file_info","description":"Retrieve detailed metadata about a file or directory, including size, creation time, last modified time, permissions, and type. This tool is useful for understanding file properties without reading the actual content.","inputSchema":{"type":"object","properties":{"path":{"type":"string","description":"Absolute path to the file or directory"}},"required":["path"]}},
      {"name":"list_allowed_directories","description":"Returns the list of directories that this server is allowed to access. Use this to understand which directories are available before trying to read or write files.","inputSchema":{"type":"object","properties":{}}}
    ]
  },
  {
    name: "Playwright",
    source: "executeautomation/mcp-playwright",
    category: "Browser Automation",
    stars: "5.3k",
    tools: [
      {"name":"playwright_navigate","description":"Navigate to a URL in the browser. This tool opens a new page or navigates the current page to the specified URL. It waits for the page to fully load before returning.","inputSchema":{"type":"object","properties":{"url":{"type":"string","description":"URL to navigate to"}},"required":["url"]}},
      {"name":"playwright_screenshot","description":"Take a screenshot of the current page or a specific element. The screenshot is saved to the specified path. You can capture the full page or just the visible viewport.","inputSchema":{"type":"object","properties":{"name":{"type":"string","description":"Name for the screenshot"},"selector":{"type":"string","description":"CSS selector to screenshot a specific element"},"fullPage":{"type":"boolean","description":"Whether to take a full page screenshot"},"width":{"type":"number","description":"Viewport width"},"height":{"type":"number","description":"Viewport height"}},"required":["name"]}},
      {"name":"playwright_click","description":"Click an element on the page. The element is identified by a CSS selector. Supports various click options including double-click, right-click, and click position offsets.","inputSchema":{"type":"object","properties":{"selector":{"type":"string","description":"CSS selector for element to click"}},"required":["selector"]}},
      {"name":"playwright_fill","description":"Fill out an input field on the page with the specified value. The field is identified by a CSS selector. This clears any existing value before typing the new one.","inputSchema":{"type":"object","properties":{"selector":{"type":"string","description":"CSS selector for the input field"},"value":{"type":"string","description":"Value to fill in the input"}},"required":["selector","value"]}},
      {"name":"playwright_select","description":"Select an option in a <select> element using the value attribute. The select element is identified by a CSS selector.","inputSchema":{"type":"object","properties":{"selector":{"type":"string","description":"CSS selector for the select element"},"value":{"type":"string","description":"Value to select"}},"required":["selector","value"]}},
      {"name":"playwright_hover","description":"Hover over an element on the page. The element is identified by a CSS selector. This triggers any hover-based interactions or tooltips.","inputSchema":{"type":"object","properties":{"selector":{"type":"string","description":"CSS selector for element to hover over"}},"required":["selector"]}},
      {"name":"playwright_evaluate","description":"Execute JavaScript in the browser context. This runs arbitrary JavaScript code in the page and returns the result. Useful for extracting data, manipulating the DOM, or testing page behavior.","inputSchema":{"type":"object","properties":{"script":{"type":"string","description":"JavaScript code to execute in the browser"}},"required":["script"]}},
      {"name":"playwright_console","description":"Get the browser console logs from the current page. Returns all console messages including log, warn, error, and info messages.","inputSchema":{"type":"object","properties":{}}},
      {"name":"playwright_close","description":"Close the browser and cleanup resources. This should be called when you're done with browser automation to free up system resources.","inputSchema":{"type":"object","properties":{}}},
      {"name":"playwright_get","description":"Perform an HTTP GET request using Playwright's built-in request context. Returns the response body and status.","inputSchema":{"type":"object","properties":{"url":{"type":"string","description":"URL to send GET request to"}},"required":["url"]}},
      {"name":"playwright_post","description":"Perform an HTTP POST request using Playwright's built-in request context. Sends JSON data and returns the response.","inputSchema":{"type":"object","properties":{"url":{"type":"string","description":"URL to send POST request to"},"value":{"type":"string","description":"JSON string of the POST body"}},"required":["url","value"]}},
      {"name":"playwright_put","description":"Perform an HTTP PUT request using Playwright's built-in request context. Sends JSON data and returns the response.","inputSchema":{"type":"object","properties":{"url":{"type":"string","description":"URL to send PUT request to"},"value":{"type":"string","description":"JSON string of the PUT body"}},"required":["url","value"]}},
      {"name":"playwright_patch","description":"Perform an HTTP PATCH request using Playwright's built-in request context. Sends JSON data and returns the response.","inputSchema":{"type":"object","properties":{"url":{"type":"string","description":"URL to send PATCH request to"},"value":{"type":"string","description":"JSON string of the PATCH body"}},"required":["url","value"]}},
      {"name":"playwright_delete","description":"Perform an HTTP DELETE request using Playwright's built-in request context. Returns the response status.","inputSchema":{"type":"object","properties":{"url":{"type":"string","description":"URL to send DELETE request to"}},"required":["url"]}}
    ]
  },
  {
    name: "Slack",
    source: "modelcontextprotocol/servers",
    category: "Communication",
    stars: "80k",
    tools: [
      {"name":"slack_list_channels","description":"List public channels in the Slack workspace with their IDs and topic information. Results are paginated and can be filtered. Use this to find channel IDs for other operations.","inputSchema":{"type":"object","properties":{"limit":{"type":"number","description":"Maximum number of channels to return (default 100, max 200)"},"cursor":{"type":"string","description":"Pagination cursor for next page"}},"required":[]}},
      {"name":"slack_post_message","description":"Post a new message to a Slack channel. Supports plain text, markdown, and Block Kit formatting. You must specify the channel ID (not the name).","inputSchema":{"type":"object","properties":{"channel_id":{"type":"string","description":"The ID of the channel to post to"},"text":{"type":"string","description":"The message text to post (Markdown supported)"}},"required":["channel_id","text"]}},
      {"name":"slack_reply_to_thread","description":"Reply to a specific message thread in Slack. Creates a threaded response to an existing message identified by its timestamp.","inputSchema":{"type":"object","properties":{"channel_id":{"type":"string","description":"The ID of the channel"},"thread_ts":{"type":"string","description":"The timestamp of the parent message"},"text":{"type":"string","description":"The reply text"}},"required":["channel_id","thread_ts","text"]}},
      {"name":"slack_add_reaction","description":"Add an emoji reaction to a message in Slack. The reaction name should not include colons (e.g., use 'thumbsup' not ':thumbsup:').","inputSchema":{"type":"object","properties":{"channel_id":{"type":"string","description":"The channel containing the message"},"timestamp":{"type":"string","description":"The timestamp of the message"},"reaction":{"type":"string","description":"The emoji name without colons"}},"required":["channel_id","timestamp","reaction"]}},
      {"name":"slack_get_channel_history","description":"Get recent messages from a Slack channel. Returns messages in reverse chronological order with their timestamps, text, and user information.","inputSchema":{"type":"object","properties":{"channel_id":{"type":"string","description":"The ID of the channel"},"limit":{"type":"number","description":"Number of messages to retrieve (default 10)"}},"required":["channel_id"]}},
      {"name":"slack_get_thread_replies","description":"Get all replies in a message thread. Returns the parent message and all threaded replies with their timestamps and content.","inputSchema":{"type":"object","properties":{"channel_id":{"type":"string","description":"The ID of the channel"},"thread_ts":{"type":"string","description":"The timestamp of the parent message"}},"required":["channel_id","thread_ts"]}},
      {"name":"slack_get_users","description":"List users in the Slack workspace. Returns user profiles including display name, real name, email, and status information.","inputSchema":{"type":"object","properties":{"cursor":{"type":"string","description":"Pagination cursor"},"limit":{"type":"number","description":"Maximum number of users to return"}},"required":[]}},
      {"name":"slack_get_user_profile","description":"Get detailed profile information for a specific Slack user by their user ID.","inputSchema":{"type":"object","properties":{"user_id":{"type":"string","description":"The user's ID"}},"required":["user_id"]}},
      {"name":"slack_search_messages","description":"Search for messages in Slack using a query string. Returns matching messages with their channel, timestamp, and context.","inputSchema":{"type":"object","properties":{"query":{"type":"string","description":"Search query"},"count":{"type":"number","description":"Number of results per page (default 20)"},"cursor":{"type":"string","description":"Pagination cursor"}},"required":["query"]}}
    ]
  },
  {
    name: "PostgreSQL",
    source: "modelcontextprotocol/servers",
    category: "Databases",
    stars: "80k",
    tools: [
      {"name":"query","description":"Run a read-only SQL query against the PostgreSQL database. Returns results as an array of objects where each object represents a row with column names as keys. Only SELECT statements and other read operations are allowed. The query is executed within a read-only transaction for safety.","inputSchema":{"type":"object","properties":{"sql":{"type":"string","description":"The SQL query to execute. Must be a read-only query (SELECT, EXPLAIN, etc.)"}},"required":["sql"]}}
    ]
  },
  {
    name: "Google Maps",
    source: "modelcontextprotocol/servers",
    category: "Location",
    stars: "80k",
    tools: [
      {"name":"maps_geocode","description":"Convert a street address or place name to geographic coordinates (latitude and longitude). Uses Google's Geocoding API for accurate results worldwide.","inputSchema":{"type":"object","properties":{"address":{"type":"string","description":"The street address or place name to geocode"}},"required":["address"]}},
      {"name":"maps_reverse_geocode","description":"Convert geographic coordinates (latitude and longitude) back to a human-readable street address. Returns the nearest address for the given coordinates.","inputSchema":{"type":"object","properties":{"latitude":{"type":"number","description":"Latitude coordinate"},"longitude":{"type":"number","description":"Longitude coordinate"}},"required":["latitude","longitude"]}},
      {"name":"maps_search_places","description":"Search for places and businesses near a location. Returns detailed information including names, addresses, ratings, and business status. Useful for finding restaurants, shops, attractions, and other points of interest.","inputSchema":{"type":"object","properties":{"query":{"type":"string","description":"Search query for places"},"location":{"type":"string","description":"Location bias as 'latitude,longitude'"},"radius":{"type":"number","description":"Search radius in meters (max 50000)"}},"required":["query"]}},
      {"name":"maps_place_details","description":"Get detailed information about a specific place using its Google Place ID. Returns comprehensive data including contact information, opening hours, reviews, photos, and more.","inputSchema":{"type":"object","properties":{"place_id":{"type":"string","description":"Google Place ID of the location"}},"required":["place_id"]}},
      {"name":"maps_distance_matrix","description":"Calculate travel distance and time between multiple origins and destinations. Supports driving, walking, bicycling, and transit modes. Returns the distance in kilometers and estimated travel time for each origin-destination pair.","inputSchema":{"type":"object","properties":{"origins":{"type":"array","items":{"type":"string"},"description":"Array of origin addresses or coordinates"},"destinations":{"type":"array","items":{"type":"string"},"description":"Array of destination addresses or coordinates"},"mode":{"type":"string","enum":["driving","walking","bicycling","transit"],"description":"Travel mode (default: driving)"}},"required":["origins","destinations"]}},
      {"name":"maps_directions","description":"Get detailed turn-by-turn directions between two locations. Supports multiple travel modes and returns step-by-step navigation instructions with distance and duration for each step.","inputSchema":{"type":"object","properties":{"origin":{"type":"string","description":"Starting point address or coordinates"},"destination":{"type":"string","description":"Ending point address or coordinates"},"mode":{"type":"string","enum":["driving","walking","bicycling","transit"],"description":"Travel mode (default: driving)"}},"required":["origin","destination"]}},
      {"name":"maps_elevation","description":"Get elevation data for one or more locations on the earth's surface. Returns the elevation in meters above sea level for each point.","inputSchema":{"type":"object","properties":{"locations":{"type":"array","items":{"type":"string"},"description":"Array of 'latitude,longitude' strings"}},"required":["locations"]}}
    ]
  },
  // ── LARGE (30+ tools) ──
  {
    name: "Puppeteer",
    source: "modelcontextprotocol/servers",
    category: "Browser Automation",
    stars: "80k",
    tools: [
      {"name":"puppeteer_navigate","description":"Navigate to a URL in the browser. Opens the specified URL and waits for the page to load completely before returning.","inputSchema":{"type":"object","properties":{"url":{"type":"string","description":"URL to navigate to"},"launchOptions":{"type":"object","description":"PuppeteerJS launch options"}},"required":["url"]}},
      {"name":"puppeteer_screenshot","description":"Take a screenshot of the current page. Captures the visible viewport or a specific element as a PNG image. The screenshot is returned as a base64-encoded string.","inputSchema":{"type":"object","properties":{"name":{"type":"string","description":"Name for the screenshot"},"selector":{"type":"string","description":"CSS selector for specific element"},"width":{"type":"number","description":"Screenshot width in pixels (default: 800)"},"height":{"type":"number","description":"Screenshot height in pixels (default: 600)"}},"required":["name"]}},
      {"name":"puppeteer_click","description":"Click an element on the page identified by CSS selector. The element must be visible and clickable.","inputSchema":{"type":"object","properties":{"selector":{"type":"string","description":"CSS selector for the element to click"}},"required":["selector"]}},
      {"name":"puppeteer_fill","description":"Fill out an input field with specified text. Clears any existing value before typing.","inputSchema":{"type":"object","properties":{"selector":{"type":"string","description":"CSS selector for the input"},"value":{"type":"string","description":"Text to enter"}},"required":["selector","value"]}},
      {"name":"puppeteer_select","description":"Select a value from a dropdown/select element.","inputSchema":{"type":"object","properties":{"selector":{"type":"string","description":"CSS selector for the select element"},"value":{"type":"string","description":"Value to select"}},"required":["selector","value"]}},
      {"name":"puppeteer_hover","description":"Hover over an element on the page.","inputSchema":{"type":"object","properties":{"selector":{"type":"string","description":"CSS selector for the element to hover"}},"required":["selector"]}},
      {"name":"puppeteer_evaluate","description":"Execute JavaScript code in the browser context and return the result.","inputSchema":{"type":"object","properties":{"script":{"type":"string","description":"JavaScript code to execute"}},"required":["script"]}}
    ]
  },
  {
    name: "Sentry",
    source: "modelcontextprotocol/servers",
    category: "Monitoring",
    stars: "80k",
    tools: [
      {"name":"list_organizations","description":"List all organizations the authenticated user has access to in Sentry. Returns organization slugs and names.","inputSchema":{"type":"object","properties":{}}},
      {"name":"list_projects","description":"List all projects within a Sentry organization. Returns project slugs, IDs, and platform information.","inputSchema":{"type":"object","properties":{"organization_slug":{"type":"string","description":"The slug of the Sentry organization"}},"required":["organization_slug"]}},
      {"name":"list_issues","description":"List issues (errors) for a Sentry project. Returns issue titles, IDs, event counts, and affected user counts. Supports filtering by query and sorting.","inputSchema":{"type":"object","properties":{"organization_slug":{"type":"string","description":"Organization slug"},"project_slug":{"type":"string","description":"Project slug"},"query":{"type":"string","description":"Search query to filter issues"},"sort":{"type":"string","enum":["date","new","priority","freq","user"],"description":"Sort order"}},"required":["organization_slug","project_slug"]}},
      {"name":"get_issue_details","description":"Get detailed information about a specific Sentry issue including its stacktrace, tags, and event history.","inputSchema":{"type":"object","properties":{"issue_id":{"type":"string","description":"The Sentry issue ID"}},"required":["issue_id"]}},
      {"name":"create_issue_comment","description":"Add a comment or note to a Sentry issue for team communication and investigation tracking.","inputSchema":{"type":"object","properties":{"issue_id":{"type":"string","description":"The Sentry issue ID"},"text":{"type":"string","description":"The comment text"}},"required":["issue_id","text"]}},
      {"name":"get_issue_events","description":"Get the list of events (occurrences) for a specific Sentry issue. Each event represents one occurrence of the error.","inputSchema":{"type":"object","properties":{"issue_id":{"type":"string","description":"The Sentry issue ID"}},"required":["issue_id"]}},
      {"name":"resolve_issue","description":"Mark a Sentry issue as resolved. This indicates the problem has been fixed.","inputSchema":{"type":"object","properties":{"issue_id":{"type":"string","description":"The Sentry issue ID"},"status":{"type":"string","enum":["resolved","unresolved","ignored"],"description":"New issue status"}},"required":["issue_id","status"]}}
    ]
  },
  {
    name: "EverArt",
    source: "modelcontextprotocol/servers",
    category: "Art & Design",
    stars: "80k",
    tools: [
      {"name":"generate_image","description":"Generate an image using AI based on a text prompt. Supports various artistic styles and parameters for controlling the output. The generated image URL is returned upon completion.","inputSchema":{"type":"object","properties":{"prompt":{"type":"string","description":"Text description of the image to generate. Be detailed and specific for best results."},"model":{"type":"string","description":"Model ID to use for generation (default: stable-diffusion)"},"image_count":{"type":"number","description":"Number of images to generate (1-4, default: 1)"}},"required":["prompt"]}},
      {"name":"list_models","description":"List all available AI models for image generation. Returns model IDs, names, descriptions, and capabilities.","inputSchema":{"type":"object","properties":{}}},
      {"name":"get_generation_status","description":"Check the status of an image generation request. Returns the current status and result URLs when complete.","inputSchema":{"type":"object","properties":{"generation_id":{"type":"string","description":"The ID of the generation to check"}},"required":["generation_id"]}},
      {"name":"train_custom_model","description":"Start training a custom image generation model using provided training images. This creates a fine-tuned model specific to your visual style or subject matter. Training typically takes 15-30 minutes.","inputSchema":{"type":"object","properties":{"name":{"type":"string","description":"Name for the custom model"},"training_images":{"type":"array","items":{"type":"string"},"description":"URLs of training images (minimum 10)"},"subject":{"type":"string","description":"The subject the model should learn (e.g., 'a golden retriever', 'modern architecture')"}},"required":["name","training_images","subject"]}}
    ]
  },
  {
    name: "SQLite",
    source: "modelcontextprotocol/servers",
    category: "Databases",
    stars: "80k",
    tools: [
      {"name":"read_query","description":"Execute a SELECT query on the SQLite database. Returns results as an array of objects. Only read operations are allowed through this tool for data safety.","inputSchema":{"type":"object","properties":{"query":{"type":"string","description":"SELECT SQL query to execute"}},"required":["query"]}},
      {"name":"write_query","description":"Execute an INSERT, UPDATE, or DELETE query on the SQLite database. Returns the number of affected rows. Use with caution as changes are permanent.","inputSchema":{"type":"object","properties":{"query":{"type":"string","description":"SQL query to execute (INSERT, UPDATE, DELETE)"}},"required":["query"]}},
      {"name":"create_table","description":"Create a new table in the SQLite database. Specify the table name and column definitions using standard SQL syntax.","inputSchema":{"type":"object","properties":{"query":{"type":"string","description":"CREATE TABLE SQL statement"}},"required":["query"]}},
      {"name":"list_tables","description":"List all tables in the SQLite database. Returns table names and their schemas.","inputSchema":{"type":"object","properties":{}}},
      {"name":"describe_table","description":"Get the schema of a specific table including column names, types, constraints, and indexes.","inputSchema":{"type":"object","properties":{"table_name":{"type":"string","description":"Name of the table to describe"}},"required":["table_name"]}},
      {"name":"append_insight","description":"Add a business insight to the memo. Use this when you discover something interesting or noteworthy during data analysis that should be remembered.","inputSchema":{"type":"object","properties":{"insight":{"type":"string","description":"Business insight discovered during analysis"}},"required":["insight"]}}
    ]
  },
  {
    name: "GitLab",
    source: "modelcontextprotocol/servers",
    category: "Version Control",
    stars: "80k",
    tools: [
      {"name":"create_or_update_file","description":"Create or update a single file in a GitLab repository. If the file exists it will be updated with a new commit; if not, it will be created.","inputSchema":{"type":"object","properties":{"project_id":{"type":"string","description":"Project ID or URL-encoded path"},"file_path":{"type":"string","description":"Path of the file in the repository"},"content":{"type":"string","description":"File content"},"commit_message":{"type":"string","description":"Commit message"},"branch":{"type":"string","description":"Target branch"},"previous_path":{"type":"string","description":"Path of file to move/rename from"}},"required":["project_id","file_path","content","commit_message","branch"]}},
      {"name":"search_repositories","description":"Search for GitLab projects/repositories matching the given query string.","inputSchema":{"type":"object","properties":{"search":{"type":"string","description":"Search query"},"page":{"type":"number","description":"Page number (default: 1)"},"per_page":{"type":"number","description":"Results per page (default: 20)"}},"required":["search"]}},
      {"name":"create_issue","description":"Create a new issue in a GitLab project with title, description, labels, and assignees.","inputSchema":{"type":"object","properties":{"project_id":{"type":"string","description":"Project ID"},"title":{"type":"string","description":"Issue title"},"description":{"type":"string","description":"Issue description (Markdown supported)"},"assignee_ids":{"type":"array","items":{"type":"number"},"description":"Assignee user IDs"},"labels":{"type":"array","items":{"type":"string"},"description":"Labels to assign"},"milestone_id":{"type":"number","description":"Milestone ID"}},"required":["project_id","title"]}},
      {"name":"create_merge_request","description":"Create a new merge request to merge changes from one branch into another.","inputSchema":{"type":"object","properties":{"project_id":{"type":"string","description":"Project ID"},"title":{"type":"string","description":"MR title"},"description":{"type":"string","description":"MR description"},"source_branch":{"type":"string","description":"Source branch with changes"},"target_branch":{"type":"string","description":"Target branch to merge into"},"draft":{"type":"boolean","description":"Create as draft MR"},"allow_collaboration":{"type":"boolean","description":"Allow commits from upstream members"}},"required":["project_id","title","source_branch","target_branch"]}},
      {"name":"fork_repository","description":"Fork a GitLab project to your own namespace or a specified group.","inputSchema":{"type":"object","properties":{"project_id":{"type":"string","description":"Project ID to fork"},"namespace":{"type":"string","description":"Target namespace/group (optional)"}},"required":["project_id"]}},
      {"name":"create_branch","description":"Create a new branch from a specified reference (branch, tag, or commit).","inputSchema":{"type":"object","properties":{"project_id":{"type":"string","description":"Project ID"},"branch":{"type":"string","description":"New branch name"},"ref":{"type":"string","description":"Source branch/tag/commit to create from"}},"required":["project_id","branch","ref"]}},
      {"name":"get_file_contents","description":"Get the contents of a file from a GitLab repository.","inputSchema":{"type":"object","properties":{"project_id":{"type":"string","description":"Project ID"},"file_path":{"type":"string","description":"Path to the file"},"ref":{"type":"string","description":"Branch/tag/commit (default: main)"}},"required":["project_id","file_path"]}},
      {"name":"list_issues","description":"List issues in a GitLab project with filtering options.","inputSchema":{"type":"object","properties":{"project_id":{"type":"string","description":"Project ID"},"state":{"type":"string","enum":["opened","closed","all"],"description":"Issue state filter"},"labels":{"type":"string","description":"Comma-separated labels"},"milestone":{"type":"string","description":"Milestone title"},"page":{"type":"number","description":"Page number"},"per_page":{"type":"number","description":"Results per page"}},"required":["project_id"]}},
      {"name":"get_issue","description":"Get detailed information about a specific issue.","inputSchema":{"type":"object","properties":{"project_id":{"type":"string","description":"Project ID"},"issue_iid":{"type":"number","description":"Issue internal ID"}},"required":["project_id","issue_iid"]}},
      {"name":"update_issue","description":"Update an existing GitLab issue.","inputSchema":{"type":"object","properties":{"project_id":{"type":"string","description":"Project ID"},"issue_iid":{"type":"number","description":"Issue internal ID"},"title":{"type":"string","description":"New title"},"description":{"type":"string","description":"New description"},"state_event":{"type":"string","enum":["close","reopen"],"description":"State transition"},"labels":{"type":"array","items":{"type":"string"},"description":"Labels"},"assignee_ids":{"type":"array","items":{"type":"number"},"description":"Assignee IDs"},"milestone_id":{"type":"number","description":"Milestone ID"}},"required":["project_id","issue_iid"]}},
      {"name":"add_issue_comment","description":"Add a comment/note to a GitLab issue.","inputSchema":{"type":"object","properties":{"project_id":{"type":"string","description":"Project ID"},"issue_iid":{"type":"number","description":"Issue internal ID"},"body":{"type":"string","description":"Comment text (Markdown)"}},"required":["project_id","issue_iid","body"]}},
      {"name":"list_merge_requests","description":"List merge requests in a GitLab project with filtering options.","inputSchema":{"type":"object","properties":{"project_id":{"type":"string","description":"Project ID"},"state":{"type":"string","enum":["opened","closed","merged","all"],"description":"MR state filter"},"page":{"type":"number"},"per_page":{"type":"number"}},"required":["project_id"]}},
      {"name":"get_merge_request","description":"Get detailed information about a specific merge request.","inputSchema":{"type":"object","properties":{"project_id":{"type":"string","description":"Project ID"},"merge_request_iid":{"type":"number","description":"MR internal ID"}},"required":["project_id","merge_request_iid"]}},
      {"name":"get_merge_request_diffs","description":"Get the diff/changes for a merge request.","inputSchema":{"type":"object","properties":{"project_id":{"type":"string","description":"Project ID"},"merge_request_iid":{"type":"number","description":"MR internal ID"}},"required":["project_id","merge_request_iid"]}},
      {"name":"update_merge_request","description":"Update an existing merge request.","inputSchema":{"type":"object","properties":{"project_id":{"type":"string","description":"Project ID"},"merge_request_iid":{"type":"number","description":"MR internal ID"},"title":{"type":"string"},"description":{"type":"string"},"state_event":{"type":"string","enum":["close","reopen"]},"labels":{"type":"array","items":{"type":"string"}},"assignee_ids":{"type":"array","items":{"type":"number"}},"milestone_id":{"type":"number"}},"required":["project_id","merge_request_iid"]}},
      {"name":"list_pipelines","description":"List CI/CD pipelines for a GitLab project.","inputSchema":{"type":"object","properties":{"project_id":{"type":"string","description":"Project ID"},"status":{"type":"string","enum":["running","pending","success","failed","canceled"],"description":"Pipeline status filter"},"ref":{"type":"string","description":"Branch/tag filter"},"page":{"type":"number"},"per_page":{"type":"number"}},"required":["project_id"]}},
      {"name":"get_pipeline","description":"Get details of a specific pipeline including status, duration, and stages.","inputSchema":{"type":"object","properties":{"project_id":{"type":"string","description":"Project ID"},"pipeline_id":{"type":"number","description":"Pipeline ID"}},"required":["project_id","pipeline_id"]}}
    ]
  },
  {
    name: "Cloudflare",
    source: "cloudflare/mcp-server-cloudflare",
    category: "Cloud Platform",
    stars: "3.2k",
    tools: [
      {"name":"workers_list","description":"List all Cloudflare Workers in your account. Returns worker names, creation dates, and deployment status.","inputSchema":{"type":"object","properties":{"limit":{"type":"number","description":"Maximum workers to return"},"cursor":{"type":"string","description":"Pagination cursor"}},"required":[]}},
      {"name":"workers_get","description":"Get details of a specific Cloudflare Worker including its script content, bindings, and configuration.","inputSchema":{"type":"object","properties":{"name":{"type":"string","description":"Worker script name"}},"required":["name"]}},
      {"name":"workers_put","description":"Deploy or update a Cloudflare Worker script. Uploads the worker code and applies bindings and configuration.","inputSchema":{"type":"object","properties":{"name":{"type":"string","description":"Worker script name"},"script":{"type":"string","description":"Worker JavaScript/TypeScript code"},"bindings":{"type":"array","description":"Worker bindings (KV, D1, R2, etc.)"}},"required":["name","script"]}},
      {"name":"workers_delete","description":"Delete a Cloudflare Worker and remove it from all routes.","inputSchema":{"type":"object","properties":{"name":{"type":"string","description":"Worker script name to delete"}},"required":["name"]}},
      {"name":"kv_namespaces_list","description":"List all Workers KV namespaces in the account.","inputSchema":{"type":"object","properties":{}}},
      {"name":"kv_get","description":"Read a value from a Workers KV namespace by key.","inputSchema":{"type":"object","properties":{"namespace_id":{"type":"string","description":"KV namespace ID"},"key":{"type":"string","description":"Key to retrieve"}},"required":["namespace_id","key"]}},
      {"name":"kv_put","description":"Write a key-value pair to a Workers KV namespace.","inputSchema":{"type":"object","properties":{"namespace_id":{"type":"string","description":"KV namespace ID"},"key":{"type":"string","description":"Key to write"},"value":{"type":"string","description":"Value to store"},"expiration_ttl":{"type":"number","description":"TTL in seconds"}},"required":["namespace_id","key","value"]}},
      {"name":"kv_delete","description":"Delete a key from a Workers KV namespace.","inputSchema":{"type":"object","properties":{"namespace_id":{"type":"string","description":"KV namespace ID"},"key":{"type":"string","description":"Key to delete"}},"required":["namespace_id","key"]}},
      {"name":"r2_list_buckets","description":"List all R2 storage buckets in the account.","inputSchema":{"type":"object","properties":{}}},
      {"name":"r2_get_object","description":"Retrieve an object from an R2 bucket.","inputSchema":{"type":"object","properties":{"bucket":{"type":"string","description":"Bucket name"},"key":{"type":"string","description":"Object key"}},"required":["bucket","key"]}},
      {"name":"r2_put_object","description":"Upload an object to an R2 bucket.","inputSchema":{"type":"object","properties":{"bucket":{"type":"string","description":"Bucket name"},"key":{"type":"string","description":"Object key"},"content":{"type":"string","description":"Object content"}},"required":["bucket","key","content"]}},
      {"name":"d1_list_databases","description":"List all D1 SQL databases in the account.","inputSchema":{"type":"object","properties":{}}},
      {"name":"d1_query","description":"Execute a SQL query against a D1 database.","inputSchema":{"type":"object","properties":{"database_id":{"type":"string","description":"D1 database ID"},"query":{"type":"string","description":"SQL query to execute"},"params":{"type":"array","description":"Query parameters for prepared statements"}},"required":["database_id","query"]}},
      {"name":"dns_list_records","description":"List DNS records for a Cloudflare zone.","inputSchema":{"type":"object","properties":{"zone_id":{"type":"string","description":"Zone ID"},"type":{"type":"string","description":"Record type filter (A, AAAA, CNAME, etc.)"}},"required":["zone_id"]}},
      {"name":"dns_create_record","description":"Create a new DNS record in a Cloudflare zone.","inputSchema":{"type":"object","properties":{"zone_id":{"type":"string","description":"Zone ID"},"type":{"type":"string","description":"Record type (A, AAAA, CNAME, etc.)"},"name":{"type":"string","description":"Record name"},"content":{"type":"string","description":"Record content/value"},"proxied":{"type":"boolean","description":"Whether to proxy through Cloudflare"},"ttl":{"type":"number","description":"TTL in seconds"}},"required":["zone_id","type","name","content"]}}
    ]
  },
  {
    name: "Notion",
    source: "makenotion/notion-mcp-server",
    category: "Productivity",
    stars: "2.8k",
    tools: [
      {"name":"notion_search","description":"Search for pages and databases in your Notion workspace. Returns titles, IDs, and metadata for matching results. Supports filtering by object type (page or database).","inputSchema":{"type":"object","properties":{"query":{"type":"string","description":"Search query text"},"filter":{"type":"object","properties":{"value":{"type":"string","enum":["page","database"]}},"description":"Filter by object type"},"sort":{"type":"object","properties":{"direction":{"type":"string","enum":["ascending","descending"]},"timestamp":{"type":"string","enum":["last_edited_time"]}}}},"required":[]}},
      {"name":"notion_get_page","description":"Retrieve a Notion page's properties and metadata by its ID.","inputSchema":{"type":"object","properties":{"page_id":{"type":"string","description":"The ID of the Notion page"}},"required":["page_id"]}},
      {"name":"notion_create_page","description":"Create a new page in a Notion database or as a child of another page. Supports rich content with blocks.","inputSchema":{"type":"object","properties":{"parent":{"type":"object","description":"Parent database or page ID"},"properties":{"type":"object","description":"Page properties matching parent schema"},"children":{"type":"array","description":"Content blocks for the page body"}},"required":["parent","properties"]}},
      {"name":"notion_update_page","description":"Update properties of an existing Notion page. Can modify any property defined in the parent database schema.","inputSchema":{"type":"object","properties":{"page_id":{"type":"string","description":"Page ID to update"},"properties":{"type":"object","description":"Properties to update"}},"required":["page_id","properties"]}},
      {"name":"notion_query_database","description":"Query a Notion database with optional filters and sorts. Returns pages matching the criteria with all their properties.","inputSchema":{"type":"object","properties":{"database_id":{"type":"string","description":"Database ID to query"},"filter":{"type":"object","description":"Filter conditions"},"sorts":{"type":"array","description":"Sort criteria"},"start_cursor":{"type":"string","description":"Pagination cursor"},"page_size":{"type":"number","description":"Results per page (max 100)"}},"required":["database_id"]}},
      {"name":"notion_get_block_children","description":"Get all child blocks of a specified block or page. Returns the content structure including text, headings, lists, and other block types.","inputSchema":{"type":"object","properties":{"block_id":{"type":"string","description":"Block or page ID"},"start_cursor":{"type":"string","description":"Pagination cursor"},"page_size":{"type":"number","description":"Results per page"}},"required":["block_id"]}},
      {"name":"notion_append_blocks","description":"Append new content blocks to a page or block. Supports all Notion block types including paragraphs, headings, lists, code blocks, and more.","inputSchema":{"type":"object","properties":{"block_id":{"type":"string","description":"Parent block or page ID"},"children":{"type":"array","description":"Array of block objects to append"}},"required":["block_id","children"]}},
      {"name":"notion_delete_block","description":"Delete a specific block from a Notion page. This is a soft delete and can be undone.","inputSchema":{"type":"object","properties":{"block_id":{"type":"string","description":"ID of the block to delete"}},"required":["block_id"]}}
    ]
  },
  {
    name: "Linear",
    source: "linear/linear-mcp-server",
    category: "Project Management",
    stars: "1.5k",
    tools: [
      {"name":"linear_create_issue","description":"Create a new issue in Linear with title, description, team, assignee, priority, and labels. Supports Markdown in the description.","inputSchema":{"type":"object","properties":{"title":{"type":"string","description":"Issue title"},"description":{"type":"string","description":"Issue description (Markdown)"},"teamId":{"type":"string","description":"Team ID to create the issue in"},"assigneeId":{"type":"string","description":"User ID to assign the issue to"},"priority":{"type":"number","description":"Priority level (0=none, 1=urgent, 2=high, 3=medium, 4=low)"},"labelIds":{"type":"array","items":{"type":"string"},"description":"Label IDs to apply"}},"required":["title","teamId"]}},
      {"name":"linear_update_issue","description":"Update an existing Linear issue. Can modify any issue field including status, assignee, priority, and custom fields.","inputSchema":{"type":"object","properties":{"issueId":{"type":"string","description":"Issue ID to update"},"title":{"type":"string","description":"New title"},"description":{"type":"string","description":"New description"},"status":{"type":"string","description":"New status name"},"assigneeId":{"type":"string","description":"New assignee ID"},"priority":{"type":"number","description":"New priority level"}},"required":["issueId"]}},
      {"name":"linear_search_issues","description":"Search for issues in Linear using natural language or Linear's filter syntax. Returns matching issues with key details.","inputSchema":{"type":"object","properties":{"query":{"type":"string","description":"Search query"},"teamId":{"type":"string","description":"Filter by team"},"status":{"type":"string","description":"Filter by status"},"assigneeId":{"type":"string","description":"Filter by assignee"},"limit":{"type":"number","description":"Max results (default: 10)"}},"required":["query"]}},
      {"name":"linear_get_teams","description":"List all teams in the Linear workspace with their IDs, names, and key settings.","inputSchema":{"type":"object","properties":{}}},
      {"name":"linear_add_comment","description":"Add a comment to a Linear issue. Supports Markdown formatting and @mentions.","inputSchema":{"type":"object","properties":{"issueId":{"type":"string","description":"Issue ID"},"body":{"type":"string","description":"Comment body (Markdown)"}},"required":["issueId","body"]}}
    ]
  },
  {
    name: "AWS KB Retrieval",
    source: "modelcontextprotocol/servers",
    category: "Cloud/AI",
    stars: "80k",
    tools: [
      {"name":"retrieve_from_knowledge_base","description":"Retrieve relevant documents and passages from an AWS Bedrock Knowledge Base using semantic search. The knowledge base uses vector embeddings to find the most relevant content for the given query. Returns document excerpts with relevance scores and source metadata.","inputSchema":{"type":"object","properties":{"query":{"type":"string","description":"The natural language query to search for in the knowledge base"},"knowledgeBaseId":{"type":"string","description":"The unique identifier of the AWS Bedrock Knowledge Base to search"},"numberOfResults":{"type":"number","description":"Maximum number of results to return (default: 5, max: 100)"},"retrievalConfiguration":{"type":"object","description":"Optional retrieval configuration for fine-tuning search behavior"}},"required":["query","knowledgeBaseId"]}}
    ]
  },
  {
    name: "Stripe",
    source: "stripe/agent-toolkit",
    category: "Finance",
    stars: "4.1k",
    tools: [
      {"name":"create_customer","description":"Create a new customer in Stripe. Customers can have payment methods, subscriptions, and invoices associated with them.","inputSchema":{"type":"object","properties":{"email":{"type":"string","description":"Customer email address"},"name":{"type":"string","description":"Customer full name"},"description":{"type":"string","description":"Description of the customer"},"phone":{"type":"string","description":"Customer phone number"},"metadata":{"type":"object","description":"Key-value metadata pairs"}},"required":["email"]}},
      {"name":"list_customers","description":"List customers in your Stripe account. Returns a paginated list of customers sorted by creation date.","inputSchema":{"type":"object","properties":{"email":{"type":"string","description":"Filter by email"},"limit":{"type":"number","description":"Number of customers to return (max 100)"},"starting_after":{"type":"string","description":"Pagination cursor"}},"required":[]}},
      {"name":"create_product","description":"Create a new product in Stripe. Products represent goods or services you sell and can be associated with prices.","inputSchema":{"type":"object","properties":{"name":{"type":"string","description":"Product name"},"description":{"type":"string","description":"Product description"},"active":{"type":"boolean","description":"Whether the product is available for purchase"},"metadata":{"type":"object","description":"Key-value metadata"}},"required":["name"]}},
      {"name":"list_products","description":"List all products in your Stripe account with optional filtering.","inputSchema":{"type":"object","properties":{"active":{"type":"boolean","description":"Filter by active status"},"limit":{"type":"number","description":"Number of products to return"},"starting_after":{"type":"string","description":"Pagination cursor"}},"required":[]}},
      {"name":"create_price","description":"Create a new price for a product. Prices define how much and how often to charge for a product.","inputSchema":{"type":"object","properties":{"product":{"type":"string","description":"Product ID"},"unit_amount":{"type":"number","description":"Price in cents"},"currency":{"type":"string","description":"Three-letter currency code (e.g., 'usd')"},"recurring":{"type":"object","properties":{"interval":{"type":"string","enum":["day","week","month","year"]},"interval_count":{"type":"number"}},"description":"Recurring billing configuration"}},"required":["product","unit_amount","currency"]}},
      {"name":"create_payment_intent","description":"Create a payment intent to collect payment from a customer. This is the core of Stripe's payment flow.","inputSchema":{"type":"object","properties":{"amount":{"type":"number","description":"Amount in cents"},"currency":{"type":"string","description":"Currency code"},"customer":{"type":"string","description":"Customer ID"},"payment_method_types":{"type":"array","items":{"type":"string"},"description":"Allowed payment methods"},"description":{"type":"string","description":"Payment description"}},"required":["amount","currency"]}},
      {"name":"create_invoice","description":"Create a draft invoice for a customer. Invoices can include line items and be sent for payment.","inputSchema":{"type":"object","properties":{"customer":{"type":"string","description":"Customer ID"},"description":{"type":"string","description":"Invoice description"},"auto_advance":{"type":"boolean","description":"Auto-finalize after creation"}},"required":["customer"]}},
      {"name":"list_invoices","description":"List invoices with optional filtering by customer and status.","inputSchema":{"type":"object","properties":{"customer":{"type":"string","description":"Filter by customer ID"},"status":{"type":"string","enum":["draft","open","paid","void","uncollectible"],"description":"Filter by status"},"limit":{"type":"number","description":"Number of results"}},"required":[]}},
      {"name":"create_subscription","description":"Create a subscription for a customer to a recurring price. Handles billing cycles, trials, and proration.","inputSchema":{"type":"object","properties":{"customer":{"type":"string","description":"Customer ID"},"items":{"type":"array","items":{"type":"object","properties":{"price":{"type":"string"}}},"description":"Subscription items with price IDs"},"trial_period_days":{"type":"number","description":"Number of trial days"}},"required":["customer","items"]}},
      {"name":"create_refund","description":"Create a refund for a payment. Can refund the full amount or a partial amount.","inputSchema":{"type":"object","properties":{"payment_intent":{"type":"string","description":"Payment Intent ID to refund"},"amount":{"type":"number","description":"Amount to refund in cents (omit for full refund)"},"reason":{"type":"string","enum":["duplicate","fraudulent","requested_by_customer"],"description":"Reason for refund"}},"required":["payment_intent"]}},
      {"name":"list_balance_transactions","description":"List balance transactions showing the flow of funds in your Stripe account.","inputSchema":{"type":"object","properties":{"limit":{"type":"number","description":"Number of transactions"},"type":{"type":"string","description":"Filter by transaction type"},"created":{"type":"object","description":"Filter by creation date"}},"required":[]}}
    ]
  },
  {
    name: "Supabase",
    source: "supabase/mcp-server-supabase",
    category: "Database/Backend",
    stars: "2.1k",
    tools: [
      {"name":"list_projects","description":"List all Supabase projects in your organization. Returns project names, IDs, regions, and status.","inputSchema":{"type":"object","properties":{}}},
      {"name":"get_project","description":"Get detailed information about a specific Supabase project including its configuration, API URL, and database connection string.","inputSchema":{"type":"object","properties":{"id":{"type":"string","description":"Project reference ID"}},"required":["id"]}},
      {"name":"execute_sql","description":"Execute a SQL query against a Supabase project's PostgreSQL database. Supports both read and write operations. Returns query results as JSON.","inputSchema":{"type":"object","properties":{"project_id":{"type":"string","description":"Supabase project ID"},"query":{"type":"string","description":"SQL query to execute"}},"required":["project_id","query"]}},
      {"name":"list_tables","description":"List all tables in a Supabase project's database with their schemas and row counts.","inputSchema":{"type":"object","properties":{"project_id":{"type":"string","description":"Project ID"}},"required":["project_id"]}},
      {"name":"apply_migration","description":"Apply a SQL migration to a Supabase project. Creates tables, functions, policies, and other database objects.","inputSchema":{"type":"object","properties":{"project_id":{"type":"string","description":"Project ID"},"name":{"type":"string","description":"Migration name"},"query":{"type":"string","description":"Migration SQL"}},"required":["project_id","name","query"]}},
      {"name":"list_extensions","description":"List PostgreSQL extensions available and installed on the project.","inputSchema":{"type":"object","properties":{"project_id":{"type":"string","description":"Project ID"}},"required":["project_id"]}},
      {"name":"get_logs","description":"Retrieve logs from a Supabase project including API logs, database logs, and edge function logs.","inputSchema":{"type":"object","properties":{"project_id":{"type":"string","description":"Project ID"},"service":{"type":"string","enum":["api","database","edge_functions","auth"],"description":"Log source"},"limit":{"type":"number","description":"Max log entries"}},"required":["project_id","service"]}}
    ]
  }
];

// ═══════════════════════════════════════════════════════════════
// BENCHMARK RUNNER
// ═══════════════════════════════════════════════════════════════

function post(url, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream', 'Content-Length': Buffer.byteLength(body) },
      timeout: 15000
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}

async function fetchLiveTools(url) {
  try {
    // Initialize
    await post(url, { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'benchmark', version: '1.0' } } });
    // Get tools
    const resp = await post(url, { jsonrpc: '2.0', id: 2, method: 'tools/list' });
    let body = resp.body;
    // Handle SSE format
    if (body.includes('data: ')) {
      for (const line of body.split('\n')) {
        if (line.startsWith('data: ')) {
          try {
            const d = JSON.parse(line.slice(6));
            if (d.result?.tools) return d.result.tools;
          } catch {}
        }
      }
    }
    const d = JSON.parse(body);
    return d.result?.tools || null;
  } catch (e) {
    console.error(`  ⚠ Live fetch failed for ${url}: ${e.message}`);
    return null;
  }
}

async function compress(tools) {
  try {
    const resp = await post(COMPRESS_URL, { tools });
    const d = JSON.parse(resp.body);
    return d;
  } catch (e) {
    return { error: e.message };
  }
}

(async () => {
  console.log('MCP Token Gateway — Compression Benchmark');
  console.log('═'.repeat(55));
  console.log(`Date: ${new Date().toISOString()}`);
  console.log(`Servers: ${servers.length}`);
  console.log('');

  const results = [];

  for (const server of servers) {
    process.stdout.write(`Testing: ${server.name}... `);

    let tools = server.tools;

    // Fetch live tools if available
    if (server.live && !tools) {
      tools = await fetchLiveTools(server.live);
      if (tools) process.stdout.write(`(live: ${tools.length} tools) `);
    }

    if (!tools || tools.length === 0) {
      console.log('SKIP (no tools)');
      continue;
    }

    // Run compression
    const result = await compress(tools);

    if (result.error) {
      console.log(`ERROR: ${result.error}`);
      continue;
    }

    const r = {
      name: server.name,
      source: server.source,
      category: server.category,
      stars: server.stars,
      toolCount: tools.length,
      tokensBefore: result.tokensBefore,
      tokensAfter: result.tokensAfter,
      tokensSaved: result.tokensSaved,
      savingsPercent: parseFloat(result.savingsPercent),
      bytesBefore: JSON.stringify(tools).length,
      bytesAfter: JSON.stringify(result.compressedTools).length,
      live: !!server.live
    };
    results.push(r);

    console.log(`${r.toolCount} tools | ${r.tokensBefore}→${r.tokensAfter} tokens | ${r.savingsPercent}%`);
  }

  // Write results JSON for report generation
  fs.writeFileSync('/tmp/benchmark-results.json', JSON.stringify(results, null, 2));
  console.log(`\nDone. ${results.length} servers benchmarked.`);
  console.log('Results saved to /tmp/benchmark-results.json');
})();
