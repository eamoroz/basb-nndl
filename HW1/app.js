fetch("train.csv")
  .then(response => response.text())
  .then(text => {
    const data = d3.csvParse(text, d3.autoType);

    /* =========================
       1. DATA OVERVIEW
    ========================= */

    const columns = data.columns;
    const rows = data.length;

    d3.select("#dataset-info").html(`
      <p><strong>Rows:</strong> ${rows}</p>
      <p><strong>Columns:</strong> ${columns.length}</p>
      <p><strong>Features:</strong> ${columns.join(", ")}</p>
    `);

    const missing = columns.map(col => {
      const missingCount = data.filter(d => d[col] === null || d[col] === "").length;
      return {
        feature: col,
        percent: ((missingCount / rows) * 100).toFixed(1)
      };
    });

    const missingTable = d3.select("#missing-table");
    missingTable.append("tr")
      .html("<th>Feature</th><th>Missing (%)</th>");

    missing.forEach(d => {
      missingTable.append("tr")
        .html(`<td>${d.feature}</td><td>${d.percent}</td>`);
    });

    const preview = data.slice(0, 5);
    const previewTable = d3.select("#preview-table");

    previewTable.append("tr")
      .selectAll("th")
      .data(columns)
      .enter()
      .append("th")
      .text(d => d);

    preview.forEach(row => {
      previewTable.append("tr")
        .selectAll("td")
        .data(columns.map(c => row[c]))
        .enter()
        .append("td")
        .text(d => d);
    });

    /* =========================
       2. DEATH RATE BY CATEGORY
    ========================= */

    function deathRateBy(feature) {
      const groups = d3.group(data, d => d[feature]);
      return Array.from(groups, ([key, values]) => {
        const deathRate = d3.mean(values, d => d.Survived === 0 ? 1 : 0);
        return { key: String(key), rate: deathRate };
      });
    }

    function barChart(canvasId, dataset, label) {
      new Chart(document.getElementById(canvasId), {
        type: "bar",
        data: {
          labels: dataset.map(d => d.key),
          datasets: [{
            label,
            data: dataset.map(d => d.rate),
            backgroundColor: "#4C72B0"
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              min: 0,
              max: 1,
              title: { display: true, text: "Death Rate" }
            }
          }
        }
      });
    }

    barChart("sexChart", deathRateBy("Sex"), "Death Rate by Sex");
    barChart("classChart", deathRateBy("Pclass"), "Death Rate by Passenger Class");
    barChart("embarkedChart", deathRateBy("Embarked"), "Death Rate by Embarkation Port");

    /* =========================
       3. NUMERICAL FEATURES
    ========================= */

    // ✅ FIX IS HERE
    function binnedDeathRate(values, bins) {
      const bin = d3.bin().thresholds(bins);
      const binned = bin(values.map(d => d.value));

      return binned
        .filter(b => b.length > 0)   // ← CRITICAL FIX
        .map(b => {
          const deathRate = d3.mean(b, d => d.survived === 0 ? 1 : 0);
          return {
            label: `${Math.round(b.x0)}–${Math.round(b.x1)}`,
            rate: deathRate
          };
        });
    }

    function numericChart(canvasId, rows, label) {
      new Chart(document.getElementById(canvasId), {
        type: "bar",
        data: {
          labels: rows.map(d => d.label),
          datasets: [{
            label,
            data: rows.map(d => d.rate),
            backgroundColor: "#55A868"
          }]
        },
        options: {
          scales: {
            y: {
              min: 0,
              max: 1,
              title: { display: true, text: "Death Rate" }
            }
          }
        }
      });
    }

    const ageData = data
      .filter(d => d.Age !== null)
      .map(d => ({ value: d.Age, survived: d.Survived }));

    numericChart(
      "ageChart",
      binnedDeathRate(ageData, 5),
      "Death Rate by Age Group"
    );

    const fareData = data.map(d => ({ value: d.Fare, survived: d.Survived }));

    numericChart(
      "fareChart",
      binnedDeathRate(fareData, 5),
      "Death Rate by Fare Group"
    );

    numericChart(
      "sibspChart",
      deathRateBy("SibSp").map(d => ({ label: d.key, rate: d.rate })),
      "Death Rate by Siblings/Spouses"
    );

    numericChart(
      "parchChart",
      deathRateBy("Parch").map(d => ({ label: d.key, rate: d.rate })),
      "Death Rate by Parents/Children"
    );

    /* =========================
       4. CORRELATION ANALYSIS
    ========================= */

    function pearson(x, y) {
      const pairs = x.map((d, i) => [d, y[i]])
        .filter(d => d[0] !== null && d[1] !== null);

      const xs = pairs.map(d => d[0]);
      const ys = pairs.map(d => d[1]);

      const meanX = d3.mean(xs);
      const meanY = d3.mean(ys);

      const num = d3.sum(xs.map((d, i) => (d - meanX) * (ys[i] - meanY)));
      const den = Math.sqrt(
        d3.sum(xs.map(d => (d - meanX) ** 2)) *
        d3.sum(ys.map(d => (d - meanY) ** 2))
      );

      return num / den;
    }

    const survived = data.map(d => d.Survived);

    const correlations = [
      { feature: "Sex (male=1)", value: pearson(
        data.map(d => d.Sex === "male" ? 1 : 0), survived) },
      { feature: "Pclass", value: pearson(
        data.map(d => d.Pclass), survived) },
      { feature: "Age", value: pearson(
        data.map(d => d.Age), survived) },
      { feature: "Fare", value: pearson(
        data.map(d => d.Fare), survived) }
    ];

    const corrTable = d3.select("#correlation-table");
    corrTable.append("tr")
      .html("<th>Feature</th><th>Pearson r</th>");

    correlations.forEach(d => {
      corrTable.append("tr")
        .html(`<td>${d.feature}</td><td>${d.value.toFixed(3)}</td>`);
    });

    /* =========================
       5. CONCLUSION
    ========================= */

    d3.select("#conclusion-text").html(`
      Across all exploratory analyses, <strong>Sex</strong> emerges as the single most
      influential factor associated with passenger death. Males exhibit a substantially
      higher death rate than females, showing the largest absolute difference among all
      categorical variables. This pattern is consistently supported by multiple bar chart
      visualizations and reinforced by the strongest correlation magnitude with survival.
      While correlation does not imply causation, the convergence of descriptive statistics
      and visual evidence identifies Sex as the dominant factor associated with mortality
      on the Titanic.
    `);
  });
