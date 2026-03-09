#!/bin/bash
# SEO Machine Integration Setup for ma-papeterie
# This script helps set up SEO Machine for B2B content creation

echo "🚀 Setting up SEO Machine integration for ma-papeterie B2B content..."

# Check if we're in the right directory
if [ ! -d ".github/agents" ]; then
    echo "❌ Error: Not in ma-papeterie project root"
    exit 1
fi

echo "📁 Creating SEO content workspace..."
mkdir -p content/{research,drafts,published,landing-pages}

echo "📋 Setting up context files for B2B education niche..."

# Create basic context files structure
cat > content/context/brand-voice.md << 'EOF'
# Ma-Papeterie Brand Voice

## Core Brand Values
- **Educational Excellence**: Supporting schools and educators with quality supplies
- **B2B Reliability**: Trusted partner for bulk educational procurement
- **Innovation**: Modern solutions for traditional educational needs
- **Sustainability**: Eco-friendly products and practices

## Voice Characteristics
- **Professional yet Approachable**: Expert knowledge delivered accessibly
- **Solution-Oriented**: Focus on outcomes and benefits for educational institutions
- **Data-Driven**: Back claims with research and real-world results
- **Inclusive**: Support for all types of educational environments

## Writing Style Guidelines
- Use active voice for clarity and confidence
- Include specific examples from real schools
- Reference educational standards and best practices
- Balance product information with educational insights
EOF

cat > content/context/target-keywords.md << 'EOF'
# Target Keywords - Educational Supplies B2B

## Primary Keywords (Pillar Content)
- school supplies wholesale
- bulk educational supplies
- B2B school supplies
- educational procurement
- school office supplies

## Secondary Keywords (Cluster Content)
- back to school supplies 2025
- classroom supplies bulk
- teacher supplies wholesale
- school supply management
- educational materials procurement

## Long-tail Keywords (Blog Content)
- best bulk notebooks for schools
- wholesale classroom supplies guide
- school supply inventory management
- educational supplies for special needs
- eco-friendly school supplies bulk

## Search Intent Classification
- **Commercial**: "buy bulk school supplies"
- **Informational**: "school supplies checklist"
- **Transactional**: "wholesale notebooks pricing"
EOF

cat > content/context/internal-links-map.md << 'EOF'
# Internal Links Map - Ma-Papeterie

## Core Product Categories
- /products/notebooks → Bulk notebooks, wholesale pricing
- /products/writing-supplies → Pens, pencils, markers for schools
- /products/classroom-supplies → Desks, chairs, storage solutions
- /products/art-supplies → Bulk art materials for education

## Content Pillars
- /blog/school-supply-guide → Comprehensive buying guide
- /blog/back-to-school-planning → Seasonal content hub
- /blog/educational-procurement → B2B procurement insights
- /blog/classroom-management → Teacher resources

## Supplier Integration Pages
- /suppliers/alkor → ALKOR product catalog
- /suppliers/softcarrier → SoftCarrier logistics
- /pricing/b2b-pricing → Dynamic pricing calculator

## Seasonal Content Hubs
- /back-to-school-2025 → Annual campaign landing page
- /summer-school-supplies → Off-season promotions
- /holiday-educational-gifts → Gift guides for schools
EOF

echo "✅ Context files created in content/context/"
echo ""
echo "🎯 Next Steps:"
echo "1. Clone SEO Machine: git clone https://github.com/TheCraigHewitt/seomachine.git"
echo "2. Copy context files to SEO Machine context/ directory"
echo "3. Configure Google Analytics/Search Console credentials"
echo "4. Run: /research school supplies wholesale strategies"
echo ""
echo "📊 Ready to create B2B SEO content for educational supplies!"