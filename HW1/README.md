### Result
https://eamoroz.github.io/basb-nndl/HW1/

### Model
ChatGPT 5.2

### Promt

Role: You are a senior data analyst and front-end data visualization engineer with experience in academic dashboards and GitHub Pages deployments. 

Task: Perform a complete Exploratory Data Analysis (EDA) of the Titanic dataset to identify the single most important factor associated with passenger death (Survived = 0). 
The output must be a polished, compact, and informative interactive dashboard suitable for academic submission. 

Hard Rules (must not be violated): 
- Use EDA only. NO machine learning, NO predictive models.
- Use only original dataset columns.
- PassengerId, Name, Ticket, Cabin must NOT be used as explanatory variables.
- All claims must be justified with visualizations and descriptive statistics.
- The dashboard alone must fully communicate the analysis and conclusion.

Dataset Requirements:
- Dataset file: train.csv
- train.csv is located in the SAME directory as the HTML and JS files
- Load data using fetch("train.csv") with a relative path only
- No file upload, no external data sources
- The dashboard must work immediately when opened via GitHub Pages

Missing Data Handling (must be explicit and visible in the dashboard): 
- Age: exclude missing values ONLY from Age-related analysis
- Embarked: keep as categorical; show missing values explicitly
- Fare: use all observations (no imputation)
- No hidden imputation or silent dropping of rows

Dashboard Structure (MANDATORY): 

1. Data Overview
- Dataset structure: dimensions (rows, columns), types of features and descriptions
- Table: % of missing values per feature
- Preview table: first 5 rows

2. Death Rate by Categorical Features
- Use normalized death rate (Survived = 0)
- Visualize death rate by:
  - Sex
  - Pclass
  - Embarked
- Use bar charts only (no pie charts)
- Consistent color palette, readable labels, compact layout

3. Numerical Feature Analysis
- Compare Survived = 0 vs Survived = 1
- Features:
  - Age (missing values excluded)
  - Fare
  - SibSp
  - Parch
- Use bar charts with explicit binning
- DO NOT use histogram chart types that require plugins
- Clearly state how missing values are handled

4. Correlation Analysis
- Use Pearson correlation with Survived (binary)
- Encode categorical variables numerically:
  - Sex: male/female
  - Embarked: S/C/Q
- Include:
  - A correlation table (Feature vs Correlation with Survived)
- Clearly state limitations:
  - Linear association only
  - Correlation does not imply causation

5. Key Insight & Conclusion
- Identify exactly ONE most influential factor associated with death
- Justify using:
  - Largest death-rate difference
  - At least two visualizations
  - Correlation magnitude
- Embed the conclusion directly in the dashboard text

Correlation computation requirements (MANDATORY):
- Do NOT use d3.correlation or any non-existent D3 helper functions
- Implement Pearson correlation explicitly using basic JavaScript and d3.mean / d3.sum
- Correlation must be computed manually from numeric arrays
- The implementation must not rely on external plugins or experimental APIs
- The correlation code must be robust to missing values and explicitly filter nulls

Design & UX Requirements:
- Compact, card-based layout
- No excessive whitespace
- Neutral academic color palette
- Clear visual hierarchy
- Readable on a single scrolling page
- Correct arrangement of elements without overlap
- Suitable for coursework or academic evaluation

Layout constraints (MANDATORY):
- Charts must be rendered in a strict vertical layout (one chart per row)
- Do NOT place multiple charts side by side in the same row
- Each chart must be wrapped in its own container
- Fixed maximum width must be applied to each chart to prevent overlap
- Responsive grid layouts (auto-fit / auto-fill) are NOT allowed
- No chart elements (axes, labels, legends) may overlap or intersect
- The dashboard must render identically without visual collisions on common screen sizes

Technical Requirements:
- Static web application
- Client-side only
- Technologies:
  - HTML
  - CSS
  - JavaScript
  - D3.js (data processing)
  - Chart.js (bar charts only)
- Provide FULL source code with explicit filenames:
  - index.html
  - style.css
  - app.js

Final Output:
- Fully working interactive dashboard
- Clear visual narrative
- A justified and unambiguous conclusion about the main factor of the death

Answer in English
