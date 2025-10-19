#!/bin/bash

# Decart Video Processor - Run Script
# סקריפט הרצה לעיבוד וידאו

echo "🚀 מפעיל את Decart Video Processor..."
echo ""

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ שגיאה: סביבה וירטואלית לא נמצאה!"
    echo "📦 יוצר סביבה וירטואלית חדשה..."
    python3 -m venv venv
    echo "✅ סביבה וירטואלית נוצרה"
fi

# Activate virtual environment
echo "🔧 מפעיל סביבה וירטואלית..."
source venv/bin/activate

# Check if requirements are installed
if ! python -c "import flask" 2>/dev/null; then
    echo "📦 מתקין תלויות..."
    pip install -r requirements.txt
    echo "✅ תלויות הותקנו"
fi

# Create necessary directories
mkdir -p output_videos
mkdir -p static/videos

echo ""
echo "✅ הכל מוכן!"
echo "🌐 השרת יפעל בכתובת: http://localhost:5001"
echo "⚠️  לעצירה: לחץ Ctrl+C"
echo ""
echo "────────────────────────────────────────"
echo ""

# Run the Flask app
python app.py



