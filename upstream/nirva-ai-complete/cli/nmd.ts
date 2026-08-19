#!/usr/bin/env ts-node
/**
 * NMD CLI — Command-line interface for Nirva Media infrastructure
 * Easy access to all 17 modules from terminal
 */

import { handleNMDRequest, orchestrateContentWorkflow } from "../server/api/nmd.ts";

interface CLIArgs {
  command: string;
  action: string;
  org: string;
  user: string;
  [key: string]: string | undefined;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  const parsed: CLIArgs = { command: "", action: "", org: "org_default", user: "user_cli" };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const value = args[i + 1];
      if (!value?.startsWith("--")) {
        parsed[key] = value;
        i++;
      } else {
        parsed[key] = "true";
      }
    } else if (i === 0) {
      parsed.command = arg;
    } else if (i === 1) {
      parsed.action = arg;
    }
  }

  return parsed;
}

async function handleCommand(args: CLIArgs) {
  const { command, action, org, user, ...payload } = args;

  console.log(`\n🎯 NMD CLI — Nirva Media Operations`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Organization: ${org}`);
  console.log(`User: ${user}`);
  console.log(`Action: ${command}.${action}\n`);

  try {
    if (command === "content" && action === "orchestrate") {
      // Full workflow orchestration
      console.log("📋 Orchestrating complete content workflow...\n");

      const workflow = await orchestrateContentWorkflow(org, user, {
        title: payload.title || "New Content",
        body: payload.body || "Content from CLI",
        tags: payload.tags ? payload.tags.split(",") : ["cli", "automated"],
      });

      console.log("✅ WORKFLOW CREATED:\n");
      console.log(JSON.stringify(workflow, null, 2));

      console.log("\n📊 Workflow Steps:");
      console.log("  1. ✅ Content created:", workflow.content.id);
      console.log("  2. ✅ Optimization insights retrieved");
      console.log("  3. ✅ Approval workflow prepared");
      console.log("  4. ✅ Publishing targets configured (", workflow.publishTargets.length, "platforms)");
      console.log("  5. ⏳ Ready for approval → publishing → monitoring\n");

      return;
    }

    // Standard API request
    const fullAction = `${command}.${action}`;

    const response = await handleNMDRequest({
      organizationId: org,
      userId: user,
      action: fullAction,
      payload,
    });

    if (response.success) {
      console.log(`✅ Success (${response.status})\n`);
      if (response.data) {
        console.log(JSON.stringify(response.data, null, 2));
      }
    } else {
      console.log(`❌ Error (${response.status})`);
      console.log(`Error: ${response.error}\n`);
      process.exit(1);
    }

    console.log(`\n⏱️  Timestamp: ${response.timestamp}\n`);
  } catch (error) {
    console.error("❌ CLI Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║           NMD CLI — Nirva Media Operations Platform            ║
║                                                                 ║
║  Usage: nmd <command> <action> [options]                       ║
╚════════════════════════════════════════════════════════════════╝

CONTENT COMMANDS
  nmd content create        Create new content
    --title "..."          Title
    --body "..."           Body content
    --tags "tag1,tag2"    Tags (comma-separated)

  nmd content optimize      Get optimization recommendations
  nmd content approve       Submit for approval
  nmd content publish       Publish content
  nmd content monitor       Check monitoring/alerts
  nmd content orchestrate   Run full workflow (create→optimize→approve→publish)

VERSION COMMANDS
  nmd version create        Create new version
    --contentId "..."      Content ID
    --title "..."          Version title
    --body "..."           Version body

  nmd version history       View version history
    --contentId "..."      Content ID

COLLABORATION COMMANDS
  nmd comment add           Add comment
    --contentId "..."      Content ID
    --text "..."           Comment text
    --mentions "user1,user2" Mentions (comma-separated)

  nmd comment resolve       Resolve comment
    --commentId "..."      Comment ID

  nmd activity feed         Get activity feed
    --contentId "..."      Content ID

METRICS COMMANDS
  nmd metric create         Create custom metric
    --name "..."           Metric name
    --description "..."    Description
    --formula "..."        Formula
    --unit "%"             Unit
    --targetValue 100      Target value
    --currentValue 75      Current value

  nmd metric record         Record metric reading
    --metricId "..."       Metric ID
    --value 85             Value

TEMPLATE COMMANDS
  nmd template search       Search templates
    --category "social"    Category
    --limit 10             Results limit

ALERT COMMANDS
  nmd alert rule create     Create alert rule
    --name "..."           Rule name
    --metric "roi"         Metric (roi|engagement|conversions|error_rate|performance_drop)
    --condition "exceeds"  Condition (exceeds|below|changes_by)
    --threshold 100        Threshold value

  nmd alert active          Get active alerts

ROI COMMANDS
  nmd roi report            Get ROI report for org
  nmd roi forecast          Forecast ROI
    --contentId "..."      Content ID

GLOBAL OPTIONS
  --org "org_id"           Organization ID (default: org_default)
  --user "user_id"         User ID (default: user_cli)
  --help                   Show this help message

EXAMPLES
  # Create and orchestrate content
  nmd content orchestrate --title "Product Launch" --body "Announcing..." --tags "launch,product"

  # Add comment to content
  nmd comment add --contentId cnt_123 --text "Great work!" --mentions user_alice,user_bob

  # Create custom metric
  nmd metric create --name "Engagement Score" --formula "interactions/impressions" --unit "%" --targetValue 10 --currentValue 6.5

  # Check ROI
  nmd roi report --org org_acme

  # Get alert status
  nmd alert active --org org_acme

  # Search templates
  nmd template search --category announcements --limit 5
`);
}

async function main() {
  const args = parseArgs();

  if (!args.command || args.command === "help" || args.command === "--help") {
    showHelp();
    return;
  }

  if (!args.action) {
    console.error("❌ Error: Missing action");
    console.error("Usage: nmd <command> <action> [options]");
    console.error("Run 'nmd help' for more information");
    process.exit(1);
  }

  await handleCommand(args);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
