fetch("train.csv")
    .then(response => response.text())
    .then(text => {
        const data = d3.csvParse(text);

        /* =====================
           DATA OVERVIEW
        ====================== */
        const totalRows = data.length;
        const columns = data.columns.length;

        document.getElementById("dataset-info").innerHTML = `
            <p><strong>Rows:</strong> ${totalRows} | <strong>Columns:</strong> ${columns}</p>
            <p>Excluded explanatory variables: PassengerId, Name, Ticket, Cabin</p>
        `;

        // Missing values table
        const missingTable = document.getElementById("missing-table");
        missingTable.innerHTML = "<tr><th>Feature</th><th>% Missing</th></tr>";

        data.columns.forEach(col => {
            const missing = data.filter(d => d[col] === "").length;
            const pct = (missing / totalRows * 100).toFixed(1);
            missingTable.innerHTML += `<tr><td>${col}</td><td>${pct}%</td></tr>`;
        });

        // Preview table
        const preview = document.getElementById("preview-table");
        preview.innerHTML = "<tr>" + data.columns.map(c => `<th>${c}</th>`).join("") + "</tr>";
        data.slice(0,5).forEach(row => {
            preview.innerHTML += "<tr>" +
                data.columns.map(c => `<td>${row[c]}</td>`).join("") +
                "</tr>";
        });

        /* =====================
           HELPER FUNCTIONS
        ====================== */
        function deathRateBy(feature) {
            const groups = d3.group(data, d => d[feature] || "Missing");
            return Array.from(groups, ([key, values]) => {
                const deaths = values.filter(v => v.Survived === "0").length;
                return {
                    key,
                    rate: deaths / values.length
                };
            });
        }

        function createBarChart(canvasId, labels, values, title) {
            new Chart(document.getElementById(canvasId), {
                type: "bar",
                data: {
                    labels,
                    datasets: [{
                        data: values,
                        backgroundColor: "#60a5fa"
                    }]
                },
                options: {
                    plugins: { title: { display: true, text: title } },
                    scales: { y: { beginAtZero: true, max: 1 } }
                }
            });
        }

        /* =====================
           CATEGORICAL
        ====================== */
        ["Sex", "Pclass", "Embarked"].forEach((f, i) => {
            const res = deathRateBy(f);
            createBarChart(
                ["sexChart","pclassChart","embarkedChart"][i],
                res.map(d => d.key),
                res.map(d => d.rate),
                `Death Rate by ${f}`
            );
        });

        /* =====================
           NUMERICAL BINS
        ====================== */
        function binnedChart(canvasId, feature, bins, excludeMissing=false) {
            let filtered = data;
            if (excludeMissing) {
                filtered = data.filter(d => d[feature] !== "");
            }

            const values = filtered.map(d => ({
                x: +d[feature],
                survived: d.Survived
            }));

            const extent = d3.extent(values, d => d.x);
            const binGen = d3.bin().domain(extent).thresholds(bins).value(d => d.x);
            const binned = binGen(values);

            const labels = binned.map(b => `${b.x0.toFixed(0)}–${b.x1.toFixed(0)}`);
            const deathRates = binned.map(b => {
                const deaths = b.filter(v => v.survived === "0").length;
                return deaths / b.length;
            });

            createBarChart(canvasId, labels, deathRates, `Death Rate by ${feature}`);
        }

        binnedChart("ageChart", "Age", 8, true);
        binnedChart("fareChart", "Fare", 8, false);
        binnedChart("sibspChart", "SibSp", 6, false);
        binnedChart("parchChart", "Parch", 6, false);

        /* =====================
           CORRELATION
        ====================== */
        function pearson(x, y) {
            const paired = x.map((v,i) => ({x:v, y:y[i]}))
                            .filter(d => d.x !== null && d.y !== null);
            const mx = d3.mean(paired, d => d.x);
            const my = d3.mean(paired, d => d.y);

            const num = d3.sum(paired, d => (d.x-mx)*(d.y-my));
            const dx = Math.sqrt(d3.sum(paired, d => Math.pow(d.x-mx,2)));
            const dy = Math.sqrt(d3.sum(paired, d => Math.pow(d.y-my,2)));
            return num / (dx*dy);
        }

        const survived = data.map(d => +d.Survived);

        const features = {
            Sex: data.map(d => d.Sex === "male" ? 1 : 0),
            Pclass: data.map(d => +d.Pclass),
            Age: data.map(d => d.Age === "" ? null : +d.Age),
            Fare: data.map(d => +d.Fare),
            SibSp: data.map(d => +d.SibSp),
            Parch: data.map(d => +d.Parch),
            Embarked: data.map(d => d.Embarked === "S" ? 0 : d.Embarked === "C" ? 1 : d.Embarked === "Q" ? 2 : null)
        };

        const corrTable = document.getElementById("correlation-table");
        corrTable.innerHTML = "<tr><th>Feature</th><th>Correlation with Survived</th></tr>";

        Object.entries(features).forEach(([k,v]) => {
            const r = pearson(v, survived);
            corrTable.innerHTML += `<tr><td>${k}</td><td>${r.toFixed(3)}</td></tr>`;
        });
    });
