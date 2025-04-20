// Example scene with interactive AI character
//
// WL Scene: https://marble.wlt-ai.art/world/fae56f5e-10d2-4f15-85ae-2004b1aa0dd9
// Assets stored at: https://ronery-assets.fly.storage.tigris.dev/
//

import * as THREE from 'three';
import { sound } from '@pixi/sound';

import * as BT from './bt.js';
import * as UI from './ui.js' 

import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import {
    SplatMesh, ForgeRenderer,
    VRButton,
    FpsMovement, PointerRotation,
    SplatLoader,
} from "@worldlabsai/forge-internal";

// -- Init BrainTrust. Project name is cozytavern
BT.initBT('cozytavern');

// this is a hack to get around a stupid vite bundling issue
import shaderSource from './shaders/splatDefines.js';
THREE.ShaderChunk['splatDefines'] = shaderSource;

const BartenderName = 'Kiya'; 

// Bartender animations
const BartenderIdleName = `./characters/${BartenderName}-idle.fbx`;
const BartenderBartendingName = `./characters/${BartenderName}-bartending.fbx`;
const BartenderDrinkingName = `./characters/${BartenderName}-drinking.fbx`;
const BartenderLeftTurnName = `./characters/${BartenderName}-left-turn.fbx`;
const BartenderLaughingName = `./characters/${BartenderName}-laughing.fbx`;
const BartenderDancingName = `./characters/${BartenderName}-dancing.fbx`;


function initSound(){
    sound.add('bar', './audio/bar.mp3');
    sound.volumeAll = 0.04;
}

// Utility function that gets response from LLM and parses out actions
// Assumes the response is in the format:
// <message>
// ###
// { "action": "drink" }
function parse_actions(response) {

    let actions = response.split("###");

    let act = {};
    if(actions.length > 1){
        // TODO! Try / catch block here
        act = JSON.parse(actions[actions.length - 1]);
        // console.log("Action: "+JSON.stringify(act));
    }

    let result = {
        msg: actions[0].trim(),
        ...act,
    };

    return result;
}
// Helper function for converting degrees to radians
const degreesToRadians = (degrees) => degrees * Math.PI / 180;

class Bartender {
    constructor() {
        this.animations = {
            idle: null,
            bartending: null,
            drinking: null,
            turn: null,
            laughing: null,
            dancing: null,
            current: null,
        };
        this.animationMixer = null;
        this.animationQueue = []; // Add queue for chaining animations
        this.history = [];
        this.focus = false; // not talking

    }

    handle_bt_response(response) {
        console.log('BT response:', response);
        let actions = parse_actions(response);
        addMessageToConversation({
            type: 'Bartender',
            content: actions.msg,
            action: actions.action,
            timestamp: new Date()
        });
        console.log('Actions:', actions);
        if(actions.action){
            if(actions.action == 'drink'){
                this.queueAnimation('drinking');
            }else if(actions.action == 'laugh'){
                this.queueAnimation('laughing');
            }else if(actions.action == 'dance'){
                this.queueAnimation('dancing');
            }else{
                console.log('Unknown action:', actions.action);
            }
        }
        this.history.push('Bartender: ' + response);
        if(actions.action){
            this.history.push('Bartender Action: ' + actions.action);
        }
    }

    // Add method to queue animations
    queueAnimation(animationName) {
        if (this.animations[animationName]) {
            this.animationQueue.push(animationName);
            console.log('Queued animation:', animationName);
            
            // If this is the first animation in the queue, start playing it
            if (this.animationQueue.length === 1) {
                this.playNextAnimation();
            }

            // if idling, just preempt
            if(this.animationQueue.length === 2 && this.animationQueue[0] === 'idle'){
                this.animationQueue.shift();
                this.playNextAnimation();
            }
        }
    }

    // Add method to play next animation in queue
    playNextAnimation() {

        // if we're playing an animation, assume character is focusing
        if(!this.focus){
            this.focus = true;
            this.animations.bartending.setLoop(THREE.LoopRepeat, 1);
        }


        if (this.animationQueue.length > 0) {
            const nextAnimationName = this.animationQueue[0];
            const nextAnimation = this.animations[nextAnimationName];
            
            if (nextAnimation) {
                console.log('Playing queued animation:', nextAnimationName);
                
                // Stop current animation
                if (this.animations.current) {
                    this.animations.current.stop();
                }
                
                // Reset and play next animation
                nextAnimation.reset();
                nextAnimation.play();
                this.animations.current = nextAnimation;
                
                // Set up completion listener
                if (this.animationMixer) {
                    const onFinished = () => {
                        console.log('Animation finished:', nextAnimationName);
                        if(nextAnimationName === 'turn'){
                            targetRotation = currentRotation + Math.PI / 1.7;
                        }
                        // Remove the completed animation from queue
                        this.animationQueue.shift();
                        // Play next animation if there is one
                        if (this.animationQueue.length > 0) {
                            this.playNextAnimation();
                        } else {
                            // If queue is empty, return to idle
                            this.queueAnimation('idle');
                        }
                        // Remove the listener
                        this.animationMixer.removeEventListener('finished', onFinished);
                    };
                    this.animationMixer.addEventListener('finished', onFinished);
                }
            }
        }
    }

    // Modify handleUserInput to use queue system
    handleUserInput(text) {
        const normalizedInput = text.toLowerCase().trim();

        if(!this.focus){
            this.focus = true;
            this.animations.bartending.setLoop(THREE.LoopRepeat, 1);
            this.queueAnimation('turn');
            this.queueAnimation('turn');
            this.queueAnimation('idle');
        }

        // For single commands, just queue that animation
        this.history.push('User: '+ normalizedInput);
        if(BT.isLoaded()){
            BT.bt("barbara-chat-b248", {
                input: normalizedInput,
                history: this.history,
            }, this.handle_bt_response.bind(this));
        }else{
            let msg = 'Sorry, I\'m not ready to talk yet.';
            addMessageToConversation({
                type: 'Bartender',
                content: msg,
                action: null,
                timestamp: new Date()
            });
            this.history.push('Bartender: '+ msg);
        }
    }
} // class Bartender

class SittingMan {
    constructor() {
        this.animations =  {
            sitLaugh: null
        };
        this.animationMixer = null;
    }
}   

let bartenderInst = new Bartender();
let sittingManInst = new SittingMan();



let bartenderObject = null;
let sittingManObject = null;

let targetRotation = Math.PI; // Starting rotation (facing away)
let currentRotation = Math.PI;


// Add conversation management at the top level
function addMessageToConversation(message) {
    const container = document.getElementById('conversationContainer');
    if (!container) return;

    const messageElement = document.createElement('div');
    messageElement.className = `conversation-message ${message.type}`;
    
    const timestamp = document.createElement('div');
    timestamp.className = 'timestamp';
    timestamp.textContent = message.timestamp.toLocaleTimeString();
    
    const content = document.createElement('div');
    content.className = 'content';
    content.textContent = message.content;

    messageElement.appendChild(timestamp);
    messageElement.appendChild(content);
    container.appendChild(messageElement);
    
    if(message.action){
        const action = document.createElement('div');
        action.className = 'action';
        action.textContent = 'action: '+message.action;
        messageElement.appendChild(action);
    }
    
    
    // Use requestAnimationFrame to ensure the DOM has updated before scrolling
    requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
    });
}

// Helper function for transitioning between animations
function transitionToAnimation(newAnimation) {
    if (bartenderInst.animations && bartenderInst.animations.current) {
        console.log('Transitioning from', bartenderInst.animations.current.getClip().name, 'to', newAnimation.getClip().name);
        
        // Stop the current animation
        bartenderInst.animations.current.stop();
        
        // Reset and start the new animation
        newAnimation.reset();
        newAnimation.play();
        
        // Update the current animation reference
        bartenderInst.animations.current = newAnimation;

        // If this is the turn animation, add a completion listener
        if (newAnimation === bartenderInst.animations.turn) {
            // Add a one-time listener for when the turn animation completes
            newAnimation.clampWhenFinished = true;
            newAnimation.setLoop(THREE.LoopOnce, 1);
            
            // Use the mixer's event system instead
            if (bartenderInst.animationMixer) {
                const onFinished = () => {
                    console.log('Turn animation finished, returning to idle');
                    transitionToAnimation(bartenderInst.animations.idle);
                    // After transitioning to idle, rotate the character
                    targetRotation = currentRotation + Math.PI / 2; // Rotate 90 degrees right (counter-clockwise)
                    // Remove the listener after it's called
                    bartenderInst.animationMixer?.removeEventListener('finished', onFinished);
                };
                bartenderInst.animationMixer.addEventListener('finished', onFinished);
            }
        }
    } else {
        console.warn('Cannot transition: animations not properly initialized');
    }
}

// Update the handleUserInput function to use the new queue system
window.handleUserInput = (text) => {
    console.log('User input:', text);
    
    // Add user message to conversation
    addMessageToConversation({
        type: 'user',
        content: text,
        timestamp: new Date()
    });
    
    if (!bartenderInst.animations) {
        console.warn('Animations not loaded yet');
        addMessageToConversation({
            type: 'assistant',
            content: 'Animations not loaded yet. Please wait.',
            timestamp: new Date()
        });
        return;
    }

    const normalizedInput = text.toLowerCase().trim();
    let response = '';
    
    switch (normalizedInput) {
        case 'sequence':
            response = 'Playing animation sequence: turn -> drink -> bartend -> idle';
            break;
        default:
            response = ''; 
    }
    
    // Handle the input using the new queue system
    bartenderInst.handleUserInput(text);
    
    if (response !== '') {
        // Add assistant response to conversation
        addMessageToConversation({
            type: 'assistant',
            content: response,
            timestamp: new Date()
        });
    }
};

async function main() {
    initSound();

    console.log('Starting main function');
    const canvas = document.getElementById("canvas");
    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }

    // Create debug text overlay
    UI.debugHUDInit();
    
    const renderer = new THREE.WebGLRenderer({ canvas });
    
    const scene = new THREE.Scene();
    
    // Add lighting to the scene
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Soft white ambient light
    scene.add(ambientLight);

    // Add directional lights for better illumination
    const frontLight = new THREE.DirectionalLight(0xffffff, 0.8);
    frontLight.position.set(0, 0, 10);
    scene.add(frontLight);

    const topLight = new THREE.DirectionalLight(0xffffff, 0.5);
    topLight.position.set(0, 10, 0);
    scene.add(topLight);

    const sideLight = new THREE.DirectionalLight(0xffffff, 0.3);
    sideLight.position.set(10, 0, 0);
    scene.add(sideLight);
    
    const forge = new ForgeRenderer({ renderer });
    scene.add(forge);

    const camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 1000);
    // Set camera position and rotation
    camera.position.set(-0.84, 0.01, 0.64);
    camera.rotation.set(degreesToRadians(2.03), degreesToRadians(-41.25), degreesToRadians(1.34));
    scene.add(camera);
    console.log('Camera created and positioned');

    const fpsMovement = new FpsMovement({ moveSpeed: 0.5 });
    const pointerRotation = new PointerRotation({ canvas });
    console.log('Movement controls initialized');

    const vrButton = VRButton.createButton(renderer);
    if (vrButton) {
        document.body.appendChild(vrButton);
        console.log('VR button added');
    }

    function handleResize() {
        console.log('Handling resize');
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }

    handleResize();
    window.addEventListener("resize", handleResize);

    // Get the input element
    const input = document.getElementById('userInput');

    // Function to run when the input gets focus
    const handleFocus = () => {
    console.log('Input is now focused');
    fpsMovement.enable = false;
    pointerRotation.enable = false;
    // Your focus code here
    };

    // Function to run when the input loses focus
    const handleBlur = () => {
    console.log('Input lost focus');
    fpsMovement.enable = true;
    pointerRotation.enable = true;
    // Your blur code here
    };

    // Add event listeners
    if (input) {
    input.addEventListener('focus', handleFocus);
    input.addEventListener('blur', handleBlur);
    }

    const url = "./scenes/bar.ply";
    console.log('Starting to load background');
    
    // Get progress bar elements
    const loadingOverlay = document.getElementById('loadingOverlay');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    
    const loader = new SplatLoader();
    loader.loadAsync(url, (event) => {
        if (event.type == "progress") {
            const progress = event.lengthComputable ? (event.loaded / event.total * 100) : 0;
            if (progressBar) progressBar.style.width = `${progress}%`;
            if (progressText) progressText.textContent = `${progress.toFixed(1)}%`;
            // console.log('Loading background:', progress.toFixed(1) + '%');
        }
    }).then((packedSplats) => {
        console.log('Background loaded, creating mesh');
        const background = new SplatMesh({
            packedSplats,
            onLoad: (mesh) => {
                console.log("Background mesh loaded");
                // Hide loading overlay and progress bar when done
            },
        });

        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
            console.log('Loading overlay hidden');
        }
        if (progressBar) {
            progressBar.style.display = 'none';
            console.log('Progress bar hidden');
        }
        if (progressText) {
            progressText.textContent = '';
            console.log('Progress text cleared');
        }

        background.quaternion.set(1, 0, 0, 0);
        background.scale.setScalar(0.3);

        scene.add(background);
        scene.add(bartenderObject);
        scene.add(sittingManObject);
        sound.play('bar', { loop: true });

    }).catch(error => {
        console.error('Error loading background:', error);
        if (progressText) {
            progressText.textContent = 'Error loading scene';
            progressText.style.color = '#ff4444';
        }
    });

    // Animation related variables
    let lastTime = null;

    // Load all animations
    console.log('Starting to load animations');
    const fbxLoader = new FBXLoader();
    const animationFiles = [
        BartenderIdleName,
        BartenderBartendingName,
        BartenderDrinkingName,
        BartenderLeftTurnName,
        BartenderLaughingName,
        BartenderDancingName,
        './characters/Man-sitting.fbx'
    ];

    // Load all animations
    const loadPromises = animationFiles.map(file => 
        new Promise((resolve, reject) => {
            console.log('Loading animation file:', file);
            fbxLoader.load(
                file,
                (object) => {
                    console.log('Loaded animation file:', file);
                    resolve(object);
                },
                (progress) => {
                    // const progressPercent = (progress.loaded / progress.total * 100).toFixed(2);
                    // console.log(`Loading ${file}: ${progressPercent}%`);
                },
                (error) => {
                    console.error('Error loading animation file:', file, error);
                    reject(error);
                }
            );
        })
    );

    // Wait for all animations to load
    Promise.all(loadPromises)
        .then(([idleModel, bartendingModel, drinkingModel, turnModel, laughingModel, dancingModel, manSitModel]) => {
            
            // Create the animation mixer
            bartenderInst.animationMixer = new THREE.AnimationMixer(bartendingModel);
            sittingManInst.animationMixer = new THREE.AnimationMixer(manSitModel);
            
            // Create animation actions
            const idleAction = bartenderInst.animationMixer.clipAction(idleModel.animations[0]);
            idleModel.animations[0].name = 'idle';
            const bartendingAction = bartenderInst.animationMixer.clipAction(bartendingModel.animations[0]);
            bartendingModel.animations[0].name = 'bartending';
            const drinkingAction = bartenderInst.animationMixer.clipAction(drinkingModel.animations[0]);
            drinkingModel.animations[0].name = 'drinking';
            const turnAction = bartenderInst.animationMixer.clipAction(turnModel.animations[0]);
            turnModel.animations[0].name = 'turn';
            const laughingAction = bartenderInst.animationMixer.clipAction(laughingModel.animations[0]);
            laughingModel.animations[0].name = 'laughing';
            const dancingAction = bartenderInst.animationMixer.clipAction(dancingModel.animations[0]);
            dancingModel.animations[0].name = 'dancing';
            const manSitModelAction = sittingManInst.animationMixer.clipAction(manSitModel.animations[0]);
            manSitModel.animations[0].name = 'manSitModel';

            // Configure actions
            [idleAction, bartendingAction, drinkingAction, turnAction, laughingAction, dancingAction].forEach(action => {
                action.clampWhenFinished = true;
                action.setLoop(THREE.LoopOnce, 1);
                action.setEffectiveTimeScale(1);
                action.setEffectiveWeight(1);
            });

            // Store the actions for later use
            bartenderInst.animations = {
                idle: idleAction,
                bartending: bartendingAction,
                drinking: drinkingAction,
                turn: turnAction,
                laughing: laughingAction,
                dancing: dancingAction,
                current: idleAction
            };

            sittingManInst.animations = {
                manSitModel: manSitModelAction
            };

            // Start with bartending animation
            bartendingAction.setLoop(THREE.LoopRepeat, Infinity);
            bartendingAction.play();
            bartenderInst.animations.current = bartendingAction;

            // Add the model to the scene
            bartenderObject = bartendingModel;
            bartenderObject.scale.setScalar(0.004);
            bartenderObject.position.set(-0.54, -0.40, -1.29);
            bartenderObject.rotation.y = Math.PI;

            // Configure the sitting man 
            manSitModelAction.clampWhenFinished = true;
            manSitModelAction.setLoop(THREE.LoopRepeat, Infinity);
            manSitModelAction.setEffectiveTimeScale(1);
            manSitModelAction.setEffectiveWeight(1);
            
            sittingManInst.animations.manSitModel = manSitModelAction;
            
            sittingManObject = manSitModel;
            sittingManObject.scale.setScalar(0.003);
            sittingManObject.position.set(0.60, -0.40, -.66);
            sittingManObject.rotation.y = -Math.PI/3;
            
            // Start dino girl animation
            manSitModelAction.play();
        })
        .catch(error => {
            console.error('Error in animation setup:', error);
        });

    console.log('Setting up render loop');

    // Render loop
    renderer.setAnimationLoop((time) => {
        time *= 0.001;
        const deltaTime = time - (lastTime ?? time);
        lastTime = time;

        pointerRotation.update(deltaTime, camera);
        fpsMovement.update(deltaTime, camera);

        // Update debug text with camera and animation information
        UI.updateDebugHUD(
            `Camera Position: (${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)})\n` +
            `Camera Rotation: (${(camera.rotation.x * 180 / Math.PI).toFixed(2)}°, ${(camera.rotation.y * 180 / Math.PI).toFixed(2)}°, ${(camera.rotation.z * 180 / Math.PI).toFixed(2)}°)\n` +
            `FPS: ${(1 / deltaTime).toFixed(1)}\n` +
            `Current Animation: ${bartenderInst.animations?.current?.getClip()?.name || 'none'}`
        );

        // Update both animation mixers if they exist
        if (bartenderInst.animationMixer) {
            bartenderInst.animationMixer.update(deltaTime);
            
            
            if (bartenderObject && Math.abs(targetRotation - currentRotation) > 0.001) {
                currentRotation = targetRotation;
                bartenderObject.rotation.y = currentRotation;
            }
        }
        
        if (sittingManInst.animationMixer) {
            sittingManInst.animationMixer.update(deltaTime);
        }

        renderer.render(scene, camera);
    });
    console.log('Render loop started');
}

// Start the application
console.log('Starting application');
main().catch(error => {
    console.error('Error in main:', error);
});
