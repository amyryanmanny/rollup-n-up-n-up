# Rollup 'nUp 'nUp – Your Automated Project Reporting Assistant

## What is Rollup 'nUp 'nUp?

Rollup 'nUp 'nUp is a powerful tool that helps project managers and team leads automatically gather GitHub data from various Issues, Project Views, and (eventually) other tracking systems, and orchestrate this scattered content directly into an organized draft report with a modular set of building blocks.

Rollup 'nUp 'nUp reduces repetitive work without obstructing essential human judgment that makes status reports valuable.

**Key Problems Addressed:**

- Inability to share similar bespoke reporting solutions between teams.
- Repetitive copy-paste work that distracts focus from strategic analysis and wastes it on text processing.
- Risk of missing critical updates buried deep in Project Views or Issue threads.
- Flaky summaries which process input text in a black box.

**🚀 Key Features:**

- **Modular Architecture**: Mix and match building blocks to create reports tailored to your exact needs.
- **GitHub Projects Integration**: Direct connection to your existing project management workflows.
- **Declarative Templates**: Define what you want without worrying about how to pull and extract it.

### The Standard Workflow

1. **Trigger**

Use GitHub Actions to trigger reports manually, or configure automated runs on your preferred cron schedule.

2. **Pull**

Pull GitHub Issues by URL, Repository, Project View and more!

3. **Transform**

Automate common data transformations, such as rendering common GitHub Objects (like Issues and Comments), and generating AI summaries.

4. **Template**

Use all the power of VentoJS to template your data into a professional report.

5. **Push**

Push a draft Markdown report to a list of common locations, such as File, Issue, Discussion, or Comment.

6. **Finalize**

Review the generated draft and add your own human analysis, context, and strategic insight to create the final report.

### Why Human Judgment Still Matters

While Rollup 'nUp 'nUp automates data collection, it intentionally preserves the most valuable parts of status reporting for human input:

- **Strategic Context**: Understanding what the data means for your stakeholders.
- **Risk Assessment**: Identifying patterns and potential issues that require attention.
- **Stakeholder Communication**: Tailoring messaging for different audiences.
- **Priority Setting**: Determining what information deserves emphasis.
- **Future Planning**: Using current status to inform next steps and decisions.

The tool handles the tedious work so you can focus on the strategic work that only humans can do.

## Benefits over GitHub Loops

- Update Detection. A consistently hard problem of report automation, is isolating signal from noise. Use Headers, HTML comments, fenced HTML blocks, or Bolded text to consistently find the most meaningful comments on an issue.
- No manual triggering required, Rollup 'nUp 'nUp can be set up to run on a regular cadence with GitHub Actions, ensuring your reports are always ready with the most current project information when you need them.
- It provides control over the prompt, and how issue data is processed before it's summarized. You can choose which fields to serialize, how many updates to include, and more!
- Easily view the context window passed into the AI, to correct errors without manually compiling the data.

## What People Have Said

> "The risks report automation is working well. It saves me 15 to 20 minutes per week and, because it has fewer manual steps, is also transferable to someone else more easily."

> "The roll-up summaries of at-risk epics and thematic summaries are working well. This week, they saved me 1.5 hrs by allowing me to quickly review the entire weekly updates without having to go through each epic individually on the project boards."

## Getting Started

For detailed setup instructions and examples, check out the [complete setup guide](https://github.com/amyryanmanny/rollup-n-up-n-up/discussions/5).

## Contribution

Before contributing, please read the [Contribution guide](./CONTRIBUTING.md).

For local development and contributing features, check out this [Dev Guide](https://github.com/amyryanmanny/rollup-n-up-n-up/blob/main/CONTRIBUTING.md#getting-started).

Have ideas for improving Rollup 'nUp 'nUp? We'd love to hear from you by logging a [request](https://github.com/github/synapse/issues/new?template=intake.yml).

## Need Help?

We're here to support you in getting Rollup 'nUp 'nUp working for your team:

- **🐕 Dogfooding Support (GitHub Internal)**: [Create a dogfooding issue](https://github.com/github/synapse/issues/new?template=dogfooder-intake.yml) for hands-on help with setup and configuration.
- **💬 Slack Support (GitHub Internal)**: Ask questions in the [#synapse team Slack channel](https://github-grid.enterprise.slack.com/archives/C08Q7NW9E06).
- **📚 Documentation**: Browse our [discussions](https://github.com/amyryanmanny/rollup-n-up-n-up/discussions) for tips and examples.
- **📋 Open an Issue**: Find a bug? Document it [here](https://github.com/amyryanmanny/rollup-n-up-n-up/issues). 
