import React, { useState, useEffect } from 'react';
import { Button, Card, Modal, Form } from 'react-bootstrap';
import Confetti from 'react-confetti';

const App = () => {
    const [projects, setProjects] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [newProject, setNewProject] = useState({ name: '', path: '', type: 'React' });
    const [editProject, setEditProject] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [deployStatus, setDeployStatus] = useState({});
    const [runningProcesses, setRunningProcesses] = useState({});
    const [showConfetti, setShowConfetti] = useState(false);
    const [windowDimensions, setWindowDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

    useEffect(() => {
        fetchProjects();
        function handleResize() {
            setWindowDimensions({ width: window.innerWidth, height: window.innerHeight });
        }
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const fetchProjects = async () => {
        try {
            const response = await fetch('/api/projects');
            const data = await response.json();
            setProjects(data);
            // Initialize running status for each project, assuming false initially
            const initialRunningStatus = data.reduce((acc, project) => ({
                ...acc,
                [project.path]: false
            }), {});
            setRunningProcesses(initialRunningStatus);
        } catch (error) {
            console.error('Failed to load projects:', error);
        }
    };

    const handleEditProject = (project) => {
        setEditProject(project);
        setNewProject({ name: project.name, path: project.path, type: project.type });
        setShowModal(true);
    };
    

    const handleSaveProject = async () => {
        const endpoint = editProject ? '/api/update-project' : '/api/add-project';
        const payload = editProject ? { old_path: editProject.path, ...newProject } : newProject;

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (data.success) {
                setProjects(data.projects);
                setShowModal(false);
                setNewProject({ name: '', path: '', type: 'React' });
                setEditProject(null); // Reset edit state
            }
        } catch (error) {
            console.error('Error saving project:', error);
        }
    };

    const handleDeleteProject = async (projectPath) => {
        const response = await fetch('/api/delete-project', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: projectPath })
        });
        const data = await response.json();
        if (data.success) {
            setProjects(data.projects);
        }
    };

    const deployProject = async (path, type) => {
        setIsLoading(true);
        setDeployStatus(prevStatus => ({ ...prevStatus, [path]: 'Updating...' }));
        try {
            const response = await fetch('/api/run-script', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path, type })
            });
            const result = await response.json();
            if (result.success) {
                setDeployStatus(prevStatus => ({ ...prevStatus, [path]: 'Deployment successful!' }));
                setShowConfetti(true);
                setTimeout(() => setShowConfetti(false), 5000); // Show confetti for 5 seconds
            } else {
                setDeployStatus(prevStatus => ({ ...prevStatus, [path]: `Error: ${result.error}` }));
            }
        } catch (error) {
            setDeployStatus(prevStatus => ({ ...prevStatus, [path]: `Error: ${error.message}` }));
        }
        setIsLoading(false);
    };

    const startProject = async (path) => {
        try {
            const response = await fetch('/api/start-project', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path })
            });
            const result = await response.json();
            if (result.success) {
                setRunningProcesses(prev => ({ ...prev, [path]: true }));
            } else {
                console.error(`Error: ${result.error}`);
            }
        } catch (error) {
            console.error(`Error: ${error.message}`);
        }
    };

    const stopProject = async (path) => {
        try {
            const response = await fetch('/api/stop-project', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path })
            });
            const result = await response.json();
            if (result.success) {
                setRunningProcesses(prev => ({ ...prev, [path]: false }));
            } else {
                console.error(`Error: ${result.error}`);
            }
        } catch (error) {
            console.error(`Error: ${error.message}`);
        }
    };

    const getWindowDimensions = () => {
        const { innerWidth: width, innerHeight: height } = window;
        return { width, height };
    };

    const { width, height } = getWindowDimensions();

    return (
        <div className="container mt-4">
            <Button onClick={() => setShowModal(true)}>Add Project</Button>
            <Modal show={showModal} onHide={() => setShowModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>{editProject ? 'Edit Project' : 'Add New Project'}</Modal.Title>
                    
                </Modal.Header>
                
                <Modal.Body>
                <h6>please specify in project name what it is</h6>
                <h6>eg. TestprojectName Frontend (react)</h6>
                <h6>eg. TestprojectName Backend (nodejs)</h6>
                <br/>
                    <Form>
                        <Form.Group controlId="formProjectName">
                            <Form.Label>Project Name</Form.Label>
                            <Form.Control
                                type="text"
                                value={newProject.name}
                                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                            />
                        </Form.Group>
                        <Form.Group controlId="formProjectPath">
                            <Form.Label>Project Path on server</Form.Label>
                            <Form.Control
                                type="text"
                                value={newProject.path}
                                onChange={(e) => setNewProject({ ...newProject, path: e.target.value })}
                            />
                        </Form.Group>
                        <Form.Group controlId="formProjectType">
                            <Form.Label>Project Type</Form.Label>
                            <Form.Control
                                as="select"
                                value={newProject.type}
                                onChange={(e) => setNewProject({ ...newProject, type: e.target.value })}
                            >
                                <option value="React">React</option>
                                <option value="Node.js">Node.js</option>
                                <option value="Flask">Flask</option>
                            </Form.Control>
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => { setShowModal(false); setEditProject(null); }}>
                        Close
                    </Button>
                    <Button variant="primary" onClick={handleSaveProject}>
                        Save
                    </Button>
                </Modal.Footer>
            </Modal>
            <br/>
            <br/>
            <br/>
            <br/>

            {projects.map((project) => (
                <Card key={project.path} className="mb-3">
                    <Card.Body>
                        <Card.Title>{project.name}</Card.Title>
                        <Button
                            variant="primary"
                            onClick={() => deployProject(project.path, project.type)}
                            disabled={isLoading || (project.type === 'Node.js' && runningProcesses[project.path])}
                        >
                            {deployStatus[project.path] === 'Updating...' ? 'Updating...' : 'Deploy to IIS'}
                        </Button>
                        {project.type === 'Node.js' && (
                            <>
                                <Button variant="success" className="ml-2" onClick={() => startProject(project.path)}>
                                    Start
                                </Button>
                                <Button variant="danger" className="ml-2" onClick={() => stopProject(project.path)}>
                                    Stop
                                </Button>                        
                                <span>
                                    Status: {runningProcesses[project.path] ? 'Running' : 'Stopped'}
                                </span>
                                
                            </>
                        )}
                        <Button
                            variant="warning"
                            className="ml-2"
                            onClick={() => handleEditProject(project)}
                        >
                            Edit
                        </Button>
                        <Button
                            variant="danger"
                            className="ml-2"
                            onClick={() => handleDeleteProject(project.path)}
                        >
                            Delete
                        </Button>
                        {deployStatus[project.path] && (
                            <div className={deployStatus[project.path].includes('Error') ? 'text-danger' : 'text-success'}>
                                {deployStatus[project.path]}
                            </div>
                        )}
                    </Card.Body>
                </Card>
            ))}
            {showConfetti && <Confetti width={windowDimensions.width} height={windowDimensions.height} />}
        </div>
    );
};

export default App;
