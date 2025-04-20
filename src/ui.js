
let debugText = null;

export function debugHUDInit(){
    debugText = document.createElement('div');
    debugText.style.position = 'absolute';
    debugText.style.top = '10px';
    debugText.style.left = '10px';
    debugText.style.color = 'white';
    debugText.style.fontFamily = 'monospace';
    debugText.style.fontSize = '14px';
    debugText.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    debugText.style.padding = '8px';
    debugText.style.borderRadius = '5px';
    debugText.style.zIndex = '1000';
    debugText.style.whiteSpace = 'pre';
    document.body.appendChild(debugText);
}

export function updateDebugHUD(text){
    if(debugText){
        debugText.textContent = text;
    }
}