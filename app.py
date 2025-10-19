from flask import Flask, render_template, request, jsonify, send_file, send_from_directory
import requests
import os
import tempfile
import uuid
from werkzeug.utils import secure_filename
import io
import csv
import glob
import logging
import traceback

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB max file size

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Allowed video extensions
ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv', 'webm'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_next_output_number():
    """Get the next sequential output number"""
    os.makedirs('output_videos', exist_ok=True)
    existing_files = glob.glob('output_videos/output_*.mp4')
    if not existing_files:
        return 1
    
    numbers = []
    for file in existing_files:
        try:
            # Extract number from filename like "output_001.mp4"
            basename = os.path.basename(file)
            number_str = basename.replace('output_', '').replace('.mp4', '')
            numbers.append(int(number_str))
        except ValueError:
            continue
    
    return max(numbers) + 1 if numbers else 1

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/static/videos/<filename>')
def serve_video(filename):
    return send_from_directory('static/videos', filename)

@app.route('/output_videos/<filename>')
def serve_output_video(filename):
    return send_from_directory('output_videos', filename)

@app.route('/process_video', methods=['POST'])
def process_video():
    try:
        # Check if video file was uploaded
        if 'video' not in request.files:
            return jsonify({'error': 'No video file provided'}), 400
        
        video_file = request.files['video']
        if video_file.filename == '':
            return jsonify({'error': 'No video file selected'}), 400
        
        if not allowed_file(video_file.filename):
            return jsonify({'error': 'Invalid file type. Please upload a video file.'}), 400
        
        # Get form data
        prompt = request.form.get('prompt', '').strip()
        orientation = request.form.get('orientation', 'landscape')
        
        if not prompt:
            return jsonify({'error': 'Please provide a prompt'}), 400
        
        # Read video content
        video_content = video_file.read()
        
        # Set dimensions based on orientation
        dimensions = {"width": 1280, "height": 704} if orientation == "landscape" else {"width": 704, "height": 1280}
        
        # Check for API key
        api_key = os.getenv('DECART_API_KEY', 'TlI3OYCRoSD2kgqDAAZnmcj4FuuAff0EbdKilUrvMrA')
        if not api_key:
            return jsonify({'error': 'DECART_API_KEY environment variable not set'}), 500
        
        # Prepare FormData for the new API
        files = {
            'data': ('input.mp4', video_content, 'video/mp4')
        }
        data = {
            'prompt': prompt
        }
        
        # Send request to Decart API
        response = requests.post(
            "https://api.decart.ai/v1/generate/lucy-pro-v2v",
            headers={
                "X-API-KEY": api_key
            },
            files=files,
            data=data,
            timeout=300  # 5 minutes timeout
        )
        
        if response.status_code != 200:
            return jsonify({'error': f'API request failed: {response.status_code}'}), 500
        
        # Generate unique filename for output
        output_filename = f"processed_{uuid.uuid4().hex[:8]}.mp4"
        
        # Save the processed video to static folder for preview
        os.makedirs('static/videos', exist_ok=True)
        output_path = f"static/videos/{output_filename}"
        
        with open(output_path, 'wb') as f:
            f.write(response.content)
        
        # Also save to output_videos with sequential number
        output_number = get_next_output_number()
        output_videos_filename = f"output_{output_number:03d}.mp4"
        output_videos_path = f"output_videos/{output_videos_filename}"
        
        with open(output_videos_path, 'wb') as f:
            f.write(response.content)
        
        # Return the video URL for preview
        video_url = f"/static/videos/{output_filename}"
        return jsonify({'success': True, 'video_url': video_url, 'output_file': output_videos_filename})
        
    except requests.exceptions.Timeout:
        return jsonify({'error': 'Request timed out. The video processing is taking too long.'}), 504
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Network error: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

@app.route('/process_csv', methods=['POST'])
def process_csv():
    try:
        logger.info("Starting CSV processing request")
        logger.info(f"Request files: {list(request.files.keys())}")
        logger.info(f"Request form: {dict(request.form)}")
        # Check if CSV file was uploaded
        if 'csv_file' not in request.files:
            return jsonify({'error': 'No CSV file provided'}), 400
        
        csv_file = request.files['csv_file']
        if csv_file.filename == '':
            return jsonify({'error': 'No CSV file selected'}), 400
        
        # Check if video file was uploaded
        if 'video' not in request.files:
            return jsonify({'error': 'No video file provided'}), 400
        
        video_file = request.files['video']
        if video_file.filename == '':
            return jsonify({'error': 'No video file selected'}), 400
        
        if not allowed_file(video_file.filename):
            return jsonify({'error': 'Invalid video file type'}), 400
        
        # Get orientation
        orientation = request.form.get('orientation', 'landscape')
        dimensions = {"width": 1280, "height": 704} if orientation == "landscape" else {"width": 704, "height": 1280}
        
        # Read video content
        video_content = video_file.read()
        
        # Check for API key
        api_key = os.getenv('DECART_API_KEY', 'TlI3OYCRoSD2kgqDAAZnmcj4FuuAff0EbdKilUrvMrA')
        if not api_key:
            return jsonify({'error': 'DECART_API_KEY environment variable not set'}), 500
        
        # Read CSV file
        csv_content = csv_file.read().decode('utf-8')
        csv_reader = csv.reader(csv_content.splitlines())
        
        results = []
        
        for row_index, row in enumerate(csv_reader):
            if not row or not row[0].strip():  # Skip empty rows
                continue
                
            prompt = row[0].strip()
            
            try:
                # Prepare FormData for the new API
                files = {
                    'data': ('input.mp4', video_content, 'video/mp4')
                }
                data = {
                    'prompt': prompt
                }
                
                # Send request to Decart API
                response = requests.post(
                    "https://api.decart.ai/v1/generate/lucy-pro-v2v",
                    headers={
                        "X-API-KEY": api_key
                    },
                    files=files,
                    data=data,
                    timeout=300
                )
                
                if response.status_code == 200:
                    # Save to output_videos with sequential number
                    output_number = get_next_output_number()
                    output_videos_filename = f"output_{output_number:03d}.mp4"
                    output_videos_path = f"output_videos/{output_videos_filename}"
                    
                    with open(output_videos_path, 'wb') as f:
                        f.write(response.content)
                    
                    # Also save to static for preview
                    preview_filename = f"batch_{uuid.uuid4().hex[:8]}.mp4"
                    preview_path = f"static/videos/{preview_filename}"
                    
                    with open(preview_path, 'wb') as f:
                        f.write(response.content)
                    
                    results.append({
                        'prompt': prompt,
                        'success': True,
                        'video_url': f"/static/videos/{preview_filename}",
                        'output_file': output_videos_filename
                    })
                else:
                    results.append({
                        'prompt': prompt,
                        'success': False,
                        'error': f'API request failed: {response.status_code}'
                    })
                    
            except Exception as e:
                results.append({
                    'prompt': prompt,
                    'success': False,
                    'error': str(e)
                })
        
        return jsonify({'success': True, 'results': results})
        
    except Exception as e:
        logger.error(f"Error in process_csv: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
