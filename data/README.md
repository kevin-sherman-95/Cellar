# Wine Dataset Directory

Place your wine dataset files (CSV or JSON) in this directory to automatically load them into the wine search system.

## Supported Formats

### JSON Format
Place JSON files (`.json`) with wine data. The system supports two formats:

**Array Format:**
```json
[
  {
    "name": "Wine Name",
    "vineyard": "Vineyard Name",
    "region": "Napa Valley",
    "country": "United States",
    "varietal": "Cabernet Sauvignon",
    "vintage": 2019,
    "description": "Wine description",
    "alcoholContent": 14.5
  }
]
```

**Object with wines array:**
```json
{
  "wines": [
    {
      "name": "Wine Name",
      "vineyard": "Vineyard Name",
      ...
    }
  ]
}
```

### CSV Format
Place CSV files (`.csv`) with headers. Supported column names:
- `name` or `wine` - Wine name
- `vineyard`, `producer`, or `winery` - Vineyard/producer name
- `region` or `subregion` - Wine region
- `country` - Country
- `varietal` or `grape` - Grape variety
- `vintage` or `year` - Vintage year
- `description` or `notes` - Wine description
- `alcoholContent` or `abv` - Alcohol content
- `image` or `label` - Image URL
- `price` - Price
- `rating` or `score` - Rating/score

Example CSV:
```csv
name,vineyard,region,country,varietal,vintage,description,alcoholContent
Caymus Cabernet Sauvignon,Caymus Vineyards,Napa Valley,United States,Cabernet Sauvignon,2019,Rich and full-bodied,14.5
```

## Where to Get Free Wine Datasets

### 1. LWIN Database (Free Download)
- **Source**: Liv-ex (https://www.liv-ex.com/)
- **Format**: CSV/JSON (check their website for current format)
- **Size**: 85,000+ wines
- **How to get**: Visit Liv-ex website and download the free LWIN database

### 2. Data.gov Wine Statistics
- **Source**: U.S. Government (https://catalog.data.gov/dataset/?tags=wine)
- **Format**: CSV
- **Content**: Wine statistics and regulatory data
- **How to get**: Search "wine" on data.gov and download datasets

### 3. Kaggle Wine Datasets
- **Source**: Kaggle (https://www.kaggle.com/datasets)
- **Format**: CSV
- **Content**: Various wine datasets uploaded by the community
- **How to get**: Search "wine" or "california wine" on Kaggle, download datasets

### 4. GitHub Wine Datasets
- **Source**: GitHub repositories
- **Format**: CSV/JSON
- **Content**: Community-contributed wine datasets
- **How to get**: Search GitHub for "wine dataset" or "napa wine data"

### 5. Regional Wine Tourism Boards
- **Napa Valley Vintners**: May have winery listings (check their website)
- **Livermore Valley Winegrowers Association**: May have member winery data
- **California Wine Institute**: May have industry data

### 6. Web Scraping (Legal Considerations)
- You can scrape publicly available winery websites
- **Important**: Always check robots.txt and terms of service
- Consider rate limiting and respectful scraping practices

## Adding Your Dataset

1. Download or create your wine dataset file
2. Save it as `.csv` or `.json` in this `/data` directory
3. Restart your development server
4. The system will automatically load and search through your dataset

## Current Dataset

This directory includes `napa-livermore-wineries.json` with 20 wines from Napa Valley and Livermore Valley as a starting point. You can expand this or add additional files.

## Notes

- Files are loaded automatically when the server starts
- Multiple files are supported - all wines will be combined
- Duplicate wines (same name, vineyard, vintage) are automatically deduplicated
- The system prioritizes dataset results over sample data








