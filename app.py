
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import subprocess
import os
import logging
import json
import signal
import psutil

app = Flask(__name__, static_folder='client/dist', static_url_path='')
CORS(app)  # This will enable CORS for all domains on all routes.

# Configure logging
logging.basicConfig(level=logging.DEBUG)
projects_file = 'projects.json'
processes = {}

def load_projects():
    try:
        with open(projects_file, 'r') as f:
            return json.load(f)
    except Exception as e:
        logging.error(f"Failed to load projects: {str(e)}")
        return []

def save_projects(projects):
    try:
        with open(projects_file, 'w') as f:
            json.dump(projects, f, indent=4)
    except Exception as e:
        logging.error(f"Failed to save projects: {str(e)}")

@app.route('/')
def serve_react_app():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static_file(path):
    return send_from_directory(app.static_folder, path)

@app.route('/api/projects', methods=['GET'])
def get_projects():
    try:
        projects = load_projects()
        return jsonify(projects)
    except Exception as e:
        logging.error(f"Error fetching projects: {str(e)}")
        return jsonify([]), 500


@app.route('/api/add-project', methods=['POST'])
def add_project():
    projects = load_projects()
    data = request.get_json()
    projects.append({'name': data['name'], 'path': data['path'], 'type': data['type']})
    save_projects(projects)
    return jsonify({'success': True, 'projects': projects})

@app.route('/api/update-project', methods=['POST'])
def update_project():
    projects = load_projects()
    data = request.get_json()
    for project in projects:
        if project['path'] == data['old_path']:
            project['name'] = data['name']
            project['path'] = data['path']
            project['type'] = data['type']
            break
    save_projects(projects)
    return jsonify({'success': True, 'projects': projects})

@app.route('/api/delete-project', methods=['POST'])
def delete_project():
    projects = load_projects()
    data = request.get_json()
    projects = [project for project in projects if project['path'] != data['path']]
    save_projects(projects)
    return jsonify({'success': True, 'projects': projects})

@app.route('/api/run-script', methods=['POST'])
def run_script():
    data = request.get_json()
    project_path = data['path']
    project_type = data['type']
    try:
        os.chdir(project_path)
        logging.debug(f"Changed directory to {project_path}")

        if project_type == 'React' or project_type == 'Node.js':
            # Full path to npm executable
            npm_path = r'C:\Program Files\nodejs\npm.cmd'

            # Pull the latest changes from GitHub
            logging.debug("Pulling latest changes from GitHub...")
            result = subprocess.run(['git', 'pull'], check=True, capture_output=True, text=True)
            logging.debug(f"Git pull output: {result.stdout}")
            logging.debug(f"Git pull errors: {result.stderr}")

            # Install dependencies
            logging.debug("Installing dependencies...")
            result = subprocess.run([npm_path, 'install'], check=True, capture_output=True, text=True)
            logging.debug(f"NPM install output: {result.stdout}")
            logging.debug(f"NPM install errors: {result.stderr}")

            if project_type == 'React':
                # Build the project
                logging.debug("Building the project...")
                result = subprocess.run([npm_path, 'run', 'build'], check=True, capture_output=True, text=True)
                logging.debug(f"NPM build output: {result.stdout}")
                logging.debug(f"NPM build errors: {result.stderr}")

        elif project_type == 'Flask':
            # Pull the latest changes from GitHub
            logging.debug("Pulling latest changes from GitHub...")
            result = subprocess.run(['git', 'pull'], check=True, capture_output=True, text=True)
            logging.debug(f"Git pull output: {result.stdout}")
            logging.debug(f"Git pull errors: {result.stderr}")

            # # Install dependencies
            # logging.debug("Installing dependencies...")
            # result = subprocess.run(['pip', 'install', '-r', 'requirements.txt'], check=True, capture_output=True, text=True)
            # logging.debug(f"Pip install output: {result.stdout}")
            # logging.debug(f"Pip install errors: {result.stderr}")

        return jsonify({'success': True, 'output': 'Deployment successful!'})
    except subprocess.CalledProcessError as e:
        logging.error(f"Failed to run script: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/start-project', methods=['POST'])
def start_project():
    data = request.get_json()
    project_path = data['path']
    bat_file_content = f"""
    @echo off
    cd /d "{project_path}"
    start cmd /k "node server.js"
    pause
    """
    bat_file_path = os.path.join(project_path, 'start_project.bat')
    with open(bat_file_path, 'w') as f:
        f.write(bat_file_content)
    process = subprocess.Popen(bat_file_path, creationflags=subprocess.CREATE_NEW_CONSOLE)
    processes[project_path] = process
    return jsonify({'success': True})

@app.route('/api/stop-project', methods=['POST'])
def stop_project():
    data = request.get_json()
    project_path = data['path']
    if project_path in processes:
        process = processes[project_path]
        parent = psutil.Process(process.pid)
        for child in parent.children(recursive=True):  # or parent.children() for recursive=False
            child.kill()
        parent.kill()
        process.wait()
        del processes[project_path]
        return jsonify({'success': True})
    else:
        return jsonify({'success': False, 'error': 'No running process found for the specified project'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True, port=32400)


