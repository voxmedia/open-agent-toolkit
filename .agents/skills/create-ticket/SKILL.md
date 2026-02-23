---
name: create-ticket
version: 1.0.0
description: Use when a bug, task, or story needs tracking in the DWP Jira project. Creates a Jira ticket through Atlassian MCP integration.
argument-hint: "[title \"...\"] [type \"...\"] [priority \"...\"]"
disable-model-invocation: true
user-invocable: true
---

# Create Jira Ticket

Create a new ticket on the DWP project board in Jira.

## Arguments

Parse the following from `$ARGUMENTS`:

- **title**: Ticket title (in quotes)
- **type**: Bug, Story, Task, or Subtask (default: Task)
- **priority**: Lowest, Low, Medium, High, Highest (default: Medium)
- **description**: Detailed description (in quotes)
- **parent**: Parent issue key for Subtasks (e.g., DWP-1234)

## Workflow

### Step 1: Gather Ticket Information

Collect the following from the user (skip if provided in arguments):

**Required:**

- **Title**: Clear, concise summary of the ticket
- **Type**: Bug, Story, Task, or Subtask (default: Task)

**Optional:**

- **Priority**: Lowest, Low, Medium, High, Highest (default: Medium)
- **Description**: Detailed description of the work
- **Labels**: Comma-separated tags for categorization
- **Assignee**: Team member to assign
- **Parent**: Parent issue key for Subtasks (e.g., DWP-1234)

### Step 2: Confirm Details

Present a summary of all collected information and ask for confirmation before creating.

### Step 3: Create Ticket via Atlassian MCP

Use the `createJiraIssue` MCP tool with:

- `cloudId`: `96aba6b1-4c85-47bf-bd5b-a3ef7c5802ec`
- `projectKey`: `DWP`
- `summary`: Ticket title
- `issueTypeName`: Bug, Story, Task, or Subtask
- `description`: Description text (if provided)
- Other fields as applicable

### Step 4: Report Results

On success, provide:

- Issue key (e.g., DWP-1234)
- Browser URL: `https://vmproduct.atlassian.net/browse/{ISSUE_KEY}`
- Summary of created ticket

On error, display the error message and suggest troubleshooting steps.

## Examples

### Basic Usage

```
/create-ticket title "Update API documentation" type "Task"
```

```
/create-ticket title "Login fails with special characters" type "Bug" priority "High" description "Users cannot log in when email contains + characters"
```

```
/create-ticket title "Update TypeScript types" type "Subtask" parent "DWP-1234"
```

### Conversational

```
Create a task to review the authentication flow with high priority
```

```
Create a bug: Login fails with special characters in email. Priority: Highest. Labels: authentication,urgent
```

```
Create a subtask for DWP-1234: Update API types to match new schema
```

## Prerequisites

The Atlassian MCP server must be configured and accessible for this skill to work.

## Troubleshooting

**MCP Connection Failures:**

- Verify Atlassian MCP server is configured
- Check Atlassian workspace accessibility

**Permission Errors:**

- Verify you have permissions in the DWP project
- Contact workspace admin if needed

**Invalid Field Values:**

- Check issue type matches: Bug, Story, Task, Subtask
- Check priority matches: Lowest, Low, Medium, High, Highest
- For Subtask, verify parent issue exists
