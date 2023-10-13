window.addEventListener('load', initClient);

async function initClient ()
{
    const connectionInfo = await SDK3DVerse.webAPI.createOrJoinSession(AppConfig.sceneUUID);
    handleHTMLPopup();
    setupDisplayCanvas();

    SDK3DVerse.startStreamer(connectionInfo);
    await SDK3DVerse.connectToEditor();

    SDK3DVerse.engineAPI.fireEvent(SDK3DVerse.utils.invalidUUID, "start_simulation");
    setupPlayerSystem();
}

async function handleHTMLPopup() {
    discImagesList = ["midnight", "red"]
    document.getElementById('disc-image').src = "./images/discs/"+discImagesList[Math.floor(Math.random() * discImagesList.length)]+".webp";

    SDK3DVerse.notifier.on('onLoadingStarted', () => document.getElementById("message").innerHTML = "Connecting...");
    SDK3DVerse.notifier.on('onLoadingProgress', (status) => document.getElementById("message").innerHTML = status.message);
    SDK3DVerse.notifier.on('onLoadingEnded', (status) => {
        document.getElementById("message").innerHTML = status.message;
    });   
}

async function setupDisplayCanvas() {
    var canvas = document.getElementById('display_canvas');
    SDK3DVerse.setupDisplay(canvas);
    SetResolution(canvas)
    canvas.addEventListener(
        'mousedown',
        async (e) =>
        {
            var {entity} = await SDK3DVerse.engineAPI.castScreenSpaceRay(e.clientX, e.clientY, true);
            if(entity)
            {
                console.log(entity)
                
            }
        }
    );

    canvas.addEventListener(
        'keypress',
        async (e) =>
        {
            if(e.key === "c") {
                let characterController = await SDK3DVerse.engineAPI.findEntitiesByEUID("8e621cd4-3e47-41c8-aade-1f84b3908aec")
                let characterCharacterControllerComponent = characterController[0].getComponent('character_controller')
                characterCharacterControllerComponent.slopeLimit = 180;
                characterController[0].setComponent('character_controller', characterCharacterControllerComponent)
                await SDK3DVerse.onConnected();
                SDK3DVerse.engineAPI.propagateChanges()
                console.log("slopeLimit:", await SDK3DVerse.engineAPI.findEntitiesByEUID("8e621cd4-3e47-41c8-aade-1f84b3908aec"))
            }
        }
    );
        
    var isMusicPlaying = false;
    canvas.addEventListener(
        'mouseup',
        async (e) =>
        {
            var {entity} = await SDK3DVerse.engineAPI.castScreenSpaceRay(e.clientX, e.clientY, true);
            console.log("Clicked : ",entity)
            audioPlayerEntity = await SDK3DVerse.engineAPI.findEntitiesByEUID("0abf6f76-f6c2-42cf-b002-31614a0292d4")
            console.log("audioPlayerEntity : ",audioPlayerEntity)
            if(entity && await entity.getEUID() === "404f5c94-eb5d-4bee-99dd-d8d6c5505fe4")
            {
                isMusicPlaying = !isMusicPlaying;
                console.log("playsound")
                entitiesToSend = [audioPlayerEntity[0]]
                console.log("Sending Entities", entitiesToSend)
                await SDK3DVerse.engineAPI.fireEvent(AppConfig.soundEventMapUUID, "playSound", entitiesToSend, {"?playing": isMusicPlaying})          
            }
        }
    );

    window.addEventListener('keydown', setupKeyboardLayout);
}

async function setupKeyboardLayout(event)
{
    if((event.code === "KeyA" && event.key !== "a") ||
       (event.code === "KeyQ" && event.key !== "q") ||
       (event.code === "KeyZ" && event.key !== "z") ||
       (event.code === "KeyW" && event.key !== "w"))
    {
        SDK3DVerse.actionMap.setFrenchKeyboardBindings();
        window.removeEventListener('keydown', setupKeyboardLayout);
        await SDK3DVerse.onConnected();
        SDK3DVerse.actionMap.propagate();
    }
}

async function SetResolution(canvas)
{
    const canvasSize    = {width: window.innerWidth, height: window.innerHeight};

    const largestDim    = Math.max(canvasSize.width, canvasSize.height);
    const MAX_DIM       = 1920;
    const scale         = (largestDim > MAX_DIM) ? (MAX_DIM / largestDim) : 1;

    let w               = Math.floor(canvasSize.width);
    let h               = Math.floor(canvasSize.height);
    const aspectRatio   = w/h;

    if(w > h)
    {
        // landscape
        w = Math.floor(aspectRatio * h);
    }
    else
    {
        // portrait
        h = Math.floor(w / aspectRatio);
    }
    SDK3DVerse.setResolution(w, h, scale);
}

async function setupPlayerSystem() {
    // spawn the player entity which have its own camera entity & character controller entity
    const {
        playerEntity,
        cameraEntity,
        characterController
    } = await SpawnPlayer(AppConfig.characterControllerUUID);

    window.onbeforeunload = () =>
    {
        SDK3DVerse.engineAPI.deleteEntities([playerEntity]);
        return null;
    };

    await attachScripts(cameraEntity, characterController);

    await SDK3DVerse.setViewports([
        {
            id : 0,
            left : 0, top: 0, width: 1, height: 1,
            defaultControllerType : -1,
            camera: cameraEntity,
            //defaultCameraValues: SDK3DVerse.engineAPI.cameraAPI.getDefaultCameraValues(),
        }
    ]);

    await new Promise(r => setTimeout(r, 200));
    Array.from(document.getElementsByClassName('fullpage-size')).map(e => e.style.display = "none");
    document.getElementById('display_canvas').focus();
}

async function SpawnPlayer(characterControllerSceneUUID)
{

    document.getElementById("message").innerHTML = "Prepping up your player's avatar...";


    const playerTemplate  = { debug_name : {value : 'Player'} };
    SDK3DVerse.utils.resolveComponentDependencies(playerTemplate, 'scene_ref');

    playerTemplate.scene_ref.value  = characterControllerSceneUUID;

    // random start position
    //const startPositions            = await SDK3DVerse.engineAPI.findEntitiesByEUID("1347d813-ff39-4e0b-8588-d69f03cb7bd3");
    //const rnd                       = Math.floor(Math.random() * startPositions.length);
    //playerTemplate.local_transform.position  = [0,1.5,0] //startPositions[0].getComponent('local_transform');
    const playerEntity              = await SDK3DVerse.engineAPI.spawnEntity(null, playerTemplate);
    let   children                  = await SDK3DVerse.engineAPI.getEntityChildren(playerEntity);
    let cameraEntity              = children.find((child) => child.isAttached('camera'));
    let characterController       = children.find((child) => child.isAttached('character_controller'));

    //characterMesh = SDK3DVerse.engineAPI.findEntitiesByEUID("c5ade0c0-5663-447a-85e6-ba1f1651a789")[0]
    //console.log(characterMesh)
    // charLocalTransform = characterController.getComponent('local_transform')
    // charLocalTransform.scale = [0.7,0.7,0.7]
    // charLocalTransform.position = [0,1.5,0] //startPositions[0].getComponent('local_transform').position;
    // characterController.setComponent('local_transform', charLocalTransform)
    

    // camScript = cameraEntity.getComponent('script_map')
    // camScript.elements["0fe34adb-b789-4d51-8b85-7bb872b448a6"].dataJSON.distanceFromTarget = 0.5
    // cameraEntity.setComponent('script_map', camScript)

    // camLens = cameraEntity.getComponent('perspective_lens')
    // camLens.fovy = 10
    // cameraEntity.setComponent('perspective_lens', camLens)

    // camLocalTransform = cameraEntity.getComponent('local_transform')
    // camLocalTransform.position = [-10,0,0]
    // cameraEntity.setComponent('local_transform', camLocalTransform)

    //SDK3DVerse.engineAPI.propagateChanges()


    
    console.log("Player:",playerEntity)
    console.log("Cam:",cameraEntity)
    console.log("Char:", characterController)
    document.getElementById("message").innerHTML = "Awaiting teleportation accreditation...";

    children = await SDK3DVerse.engineAPI.getEntityChildren(characterController);

    return { playerEntity, cameraEntity, characterController};
}

function attachScripts(cameraEntity, characterController)
{
    const cameraScriptUUID          = Object.keys(cameraEntity.getComponent("script_map").elements).pop();
    const controllerScriptUUID      = Object.keys(characterController.getComponent("script_map").elements).pop();

    SDK3DVerse.engineAPI.attachToScript(characterController, controllerScriptUUID);
    SDK3DVerse.engineAPI.attachToScript(cameraEntity, cameraScriptUUID);

    document.getElementById("message").innerHTML = "Teleportation accreditation granted, brace yourself...";
}