# Decart Video Processor - עיבוד וידאו מתקדם

ממשק web פשוט ויפה לעיבוד וידאו באמצעות Decart API. מאפשר להחליף דמויות בוידאו עם תיאורים טקסטואליים.

## תכונות

- 🎬 **Drag & Drop** - גרירה ושחרור קל של קבצי וידאו
- 📝 **Prompts חכמים** - דוגמאות מובנות לתיאורי שינוי
- 📱 **Responsive Design** - מתאים לכל המכשירים
- 🎯 **תמיכה בכיווני וידאו** - אופקי ואנכי
- ⚡ **עיבוד מהיר** - שילוב ישיר עם Decart API
- 🌍 **ממשק בעברית** - תמיכה מלאה בעברית

## התקנה

1. **שכפול הפרויקט:**
```bash
git clone <repository-url>
cd Splice_API_01
```

2. **יצירת סביבה וירטואלית:**
```bash
python3 -m venv venv
source venv/bin/activate  # על Mac/Linux
# או
venv\Scripts\activate     # על Windows
```

3. **התקנת תלויות:**
```bash
pip install -r requirements.txt
```

4. **הגדרת API Key:**
```bash
export DECART_API_KEY="your_api_key_here"
```
או על Windows:
```cmd
set DECART_API_KEY=your_api_key_here
```

## הרצה

### דרך מהירה (מומלץ):
```bash
./run.sh
```

### דרך ידנית:
```bash
source venv/bin/activate
python app.py
```

הממשק יהיה זמין בכתובת: `http://localhost:5001`

## שימוש

1. **העלאת וידאו** - גרור קובץ וידאו לאזור ההעלאה או לחץ לבחירת קובץ
2. **הכנסת Prompt** - תאר כיצד תרצה לשנות את הדמות בוידאו
3. **בחירת כיוון** - בחר בין כיוון אופקי (1280x704) או אנכי (704x1280)
4. **עיבוד** - לחץ על "עבד וידאו" והמתן לתוצאה

## דוגמאות Prompts

- `"Replace the human with a bipedal tiger-like humanoid with orange-and-black striped fur"`
- `"Transform the person into a futuristic cyborg with glowing blue circuits"`
- `"Replace the human with an elegant elven character with pointed ears"`

## פורמטי וידאו נתמכים

- MP4
- AVI
- MOV
- MKV
- WebM

## הגבלות

- גודל קובץ מקסימלי: 100MB
- זמן עיבוד: עד 5 דקות
- נדרש מפתח API של Decart

## פתרון בעיות

### שגיאת "DECART_API_KEY not set"
וודא שהגדרת את משתנה הסביבה `DECART_API_KEY` עם המפתח שלך.

### שגיאת "Request timed out"
הוידאו לוקח זמן רב לעיבוד. נסה עם וידאו קצר יותר או בדוק את החיבור לאינטרנט.

### שגיאת "Invalid file type"
וודא שהקובץ הוא בפורמט וידאו נתמך (MP4, AVI, MOV, MKV, WebM).

## טכנולוגיות

- **Backend**: Flask (Python)
- **Frontend**: HTML5, CSS3, JavaScript
- **API**: Decart Video Processing API
- **UI**: Responsive design עם Font Awesome icons

## רישיון

MIT License

## תמיכה

לבעיות ושאלות, פתח issue בגיטהאב או צור קשר עם המפתח.

