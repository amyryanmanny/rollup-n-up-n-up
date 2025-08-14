import QuickChart from "quickchart-js";

export function quickChartUrlEmbedMarkdown(
  url: string,
  ariaLabel?: string,
): string {
  return `![${ariaLabel || "Metrics"}](${url})`;
}

// TODO: Support multiple sets of data in the same chart
export function barChart(
  data: Map<string, number>,
  fieldName: string,
  title: string,
): string {
  const chart = new QuickChart();
  chart
    .setConfig({
      type: "bar",
      data: {
        labels: Array.from(data.keys()),
        datasets: [
          {
            label: fieldName,
            data: Array.from(data.values()),
          },
        ],
      },
      options: {
        title: {
          display: true,
          text: title,
        },
      },
    })
    .setWidth(800)
    .setHeight(400)
    .setBackgroundColor("transparent");

  return quickChartUrlEmbedMarkdown(chart.getUrl(), `Bar Chart of ${title}`);
}
