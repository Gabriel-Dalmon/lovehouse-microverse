window.addEventListener('load', initClient);

async function initClient ()
{
    
    discImagesList = ["midnight", "red"]
    document.getElementById('disc-image').src = "./images/discs/"+discImagesList[Math.floor(Math.random() * discImagesList.length)]+".webp";

    const connectionInfo = await SDK3DVerse.webAPI.createOrJoinSession(AppConfig.sceneUUID);

    SDK3DVerse.notifier.on('onLoadingStarted', () => document.getElementById("message").innerHTML = "Connecting...");
    SDK3DVerse.notifier.on('onLoadingProgress', (status) => document.getElementById("message").innerHTML = status.message);
    SDK3DVerse.notifier.on('onLoadingEnded', (status) => {
        document.getElementById("message").innerHTML = status.message;
    });
    
    var canvas = document.getElementById('display_canvas');
    SDK3DVerse.setupDisplay(canvas);
    SetResolution(canvas)

    SDK3DVerse.startStreamer(connectionInfo);
    
    SDK3DVerse.connectToEditor();

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