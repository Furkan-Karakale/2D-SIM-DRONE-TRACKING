var canvas = document.querySelector('canvas');

canvas.width =  window.innerWidth;
canvas.height = window.innerHeight;

var c = canvas.getContext('2d');

var mouse = {
    x:undefined,
    y:undefined
}

var colorArray= 
[
    '#ffaa33',
    '#99ffaa',
    '#00ff00',
    '#4411aa',
    '#ff1100'
];

function randomIntFromRange(min,max)
{
    return Math.floor(Math.random()*(max-min+1)+min);
}

window.addEventListener('mousemove', function(event)
{
    mouse.x = event.x;
    mouse.y = event.y;
})

window.addEventListener('resize', function(event)
{
    canvas.width =  window.innerWidth;
    canvas.height = window.innerHeight;
    init();
})



canvas.addEventListener('click', function(event) {

    hedef.newPoint(event.x,event.y)

 }, false);


PID = function()
{
    this.kP = 0;
    this.kD = 0;
    this.kI = 0;
    this.cumData = 0;
    this.maxOutput = 0;
    this.minOutput = 0;
    this.isFuzzy = false; 
    this.lastErr;
    this.pNodes = []
    this.dNodes = []
    this.iNodes = []
    this.averageElapsedTime;
    this.cal = function(err,elapsedTime)
    {
        output=NaN;
        if(this.lastErr)
        {
            deltaErr = err - this.lastErr;
            if(this.averageElapsedTime) elapsedTime = elapsedTime / this.averageElapsedTime
            if(this.isFuzzy)
            {
                kP = fuzzy(err,this.pNodes)
                kD = fuzzy(deltaErr,this.dNodes)
                kI = fuzzy(this.cumData,this.iNodes)
                output = this.calcP(err,kP) + this.calcI(err,kD,elapsedTime) + this.calcD(err,kI,elapsedTime)
            }
            else
            {
                output = this.calcP(err,this.kP) + this.calcI(deltaErr,this.kD,elapsedTime) + this.calcD(err,this.kI,elapsedTime)
            }
            if(output > this.maxOutput) output = this.maxOutput
            if(output < this.minOutput) output = this.minOutput
        }
        this.lastErr = err;
        return output;
    }
    this.calcP = function(err,kp)
    {
        return err*kp
    }
    this.calcD = function(deltaErr,kd,elapsedTime)
    {
        return deltaErr/elapsedTime*kd
    }
    this.calcI = function(err,ki,elapsedTime)
    {
        this.cumData += err*elapsedTime*ki
        return this.cumData
    }
}

function IHA(){ 
    this.x = canvas.width*0.1;
    this.y = canvas.height*0.5;
    this.speedY = 0; 
    this.maxSpeed = 2;
    this.pitch = 0;
    this.viewAngle = 72;
    this.viewDistance = 1000;
    this.sightDistance = 100;
    this.angle=0
    this.lastAngle=0
    this.updatePos = function()
    {   
        hedef.x += this.pitch/10;
        hedef.y -= this.speedY;
        this.speedY *= 0.95;
        if(this.speedY>this.maxSpeed)this.speedY=this.maxSpeed
        else if(this.speedY<-this.maxSpeed)this.speedY=-this.maxSpeed
    }
    return this;
}

function Point(){
    this.x = canvas.width*0.5;
    this.y = canvas.height*0.4;
    this.speedX = ( Math.random()-0.5 );
    this.speedY = ( Math.random()-0.5 ); 
    this.radius = 100 + Math.random()*20;
    this.newPoint = function(x,y)
    {
        this.x = x;
        this.y = y;
        this.radius = 100 + Math.random()*20;    
        this.speedX = ( Math.random()-0.5 );
        this.speedY = ( Math.random()-0.5 ); 
    }    
    this.updatePos = function()
    {   
        this.x += this.speedX 
        this.y += this.speedY 
    }
}

Yaw = 0;
Pitch = 0;
Roll = 0;
lastPoint = [];
drone = new IHA();
hedef = new Point();



function init()
{

}


statusColor = "#FF0000"
startTime = new Date();
lastTime = undefined;

pidPitch = new PID();
pidPitch.kP = 1;
pidPitch.kD = 2;
pidPitch.kI = 5;
pidPitch.maxOutput = 3;
pidPitch.minOutput = -3;
pidPitch.averageElapsedTime = 15;

pidSpeedY = new PID();
pidSpeedY.kP = 2;
pidSpeedY.kD = 4;
pidSpeedY.kI = 5;
pidSpeedY.maxOutput = 3;
pidSpeedY.minOutput = -3;
pidSpeedY.averageElapsedTime = 15;

function animate()
{
    requestAnimationFrame(animate)

    c.fillStyle = "rgba(255,255,255,1)";
    c.fillRect(0,0,innerWidth,innerHeight);
    startTime = new Date();
    data = drawDrone()
    sizeReturn = data[0]
    startPoint = data[1].pos
    endPoint = data[2].pos
    sight = data[3]
    hedefMidPoint = [(startPoint[0]+endPoint[0])/2,(startPoint[1]+endPoint[1])/2]
    sightMidPoint = [(sight[0][0]+sight[1][0])/2,(sight[0][1]+sight[1][1])/2]

    H = 2 * Math.sign((hedefMidPoint[1] - sightMidPoint[1])) * Math.sqrt( (hedefMidPoint[0] - sightMidPoint[0])**2 + (hedefMidPoint[1] - sightMidPoint[1])**2 )
        /  Math.sqrt( (sight[1][0] - sight[0][0])**2 + (sight[1][1] - sight[0][1])**2 )

    drawCircle(hedefMidPoint[0],hedefMidPoint[1],5,"#00FF00")
    drawCircle(sightMidPoint[0],sightMidPoint[1],5,"#00FF00")

    distance = sizeReturn

    setDistance = 0.2 
    errD = setDistance - distance;
    errH = Math.round(H*100)/100
    
    console.log(errH, errD)
    if(lastTime)
    {
        elapsedTime = startTime - lastTime
        
        data1 = pidPitch.cal(errD, elapsedTime)
        data2 = pidSpeedY.cal(errH,elapsedTime)

        if(data1 && data2)
        {
            drone.pitch -= data1;
            drone.speedY += data2;
        }
    }

    lastTime = startTime;
    drone.updatePos();
    hedef.updatePos();
}   


function drawYaw(accYaw)
{
    offset = 10*accYaw/5
    kanatPos0 = [ canvas.width/2 + offset , canvas.height/2 - 25  ]
    kanatPos1 = [ canvas.width/2 + offset , canvas.height/2 - 75 ]
    stroke(kanatPos0,kanatPos1,"#0000FF" , "5")
}

function drawRoll(accRoll)
{
    offset = 10*accRoll/5
    kanatPos0 = [ canvas.width/2-175   , canvas.height/2 + offset  ]
    kanatPos1 = [ canvas.width/2-75    , canvas.height/2 + offset  ]
    kanatPos2 = [ canvas.width/2+75    , canvas.height/2 - offset  ]
    kanatPos3 = [ canvas.width/2+175   , canvas.height/2 - offset  ] 
    stroke(kanatPos0,kanatPos1,"#FF0000" , "5")
    stroke(kanatPos2,kanatPos3,"#FF0000" , "5")
}

function drawPitch(accPitch)
{
    offset = 10*accPitch/5
    kanatPos0 = [ canvas.width/2 - 40 , canvas.height/2 - offset  ]
    kanatPos1 = [ canvas.width/2 + 40 , canvas.height/2 - offset ]
    stroke(kanatPos0,kanatPos1,"#00FF00" , "5")
}

function drawDrone()
{
    drawCircle(drone.x,drone.y,5,"#000000")

    dot2=[]
    d1X = Math.cos((-drone.pitch + drone.viewAngle/2)/180*Math.PI)
    d1Y = Math.sin((-drone.pitch + drone.viewAngle/2)/180*Math.PI)

    dot2[0] =  drone.x + drone.viewDistance * d1X
    dot2[1] =  drone.y + drone.viewDistance * d1Y

    dot3=[]
    d2X = Math.cos((-drone.pitch - drone.viewAngle/2)/180*Math.PI)
    d2Y = Math.sin((-drone.pitch - drone.viewAngle/2)/180*Math.PI)

    dot3[0] =  drone.x + drone.viewDistance * d2X
    dot3[1] =  drone.y + drone.viewDistance * d2Y

    sight = [[drone.x+d1X*drone.sightDistance,drone.y+d1Y*drone.sightDistance],[drone.x+d2X*drone.sightDistance,drone.y+d2Y*drone.sightDistance]]

    data = calTangents(hedef , drone , hedef.radius)

    stroke ([drone.x,drone.y],dot2 , "#000000" , 2)
    stroke ([drone.x,drone.y],dot3 , "#000000" , 2)
    drawCircle(hedef.x,hedef.y,hedef.radius,"#000000")

    stroke ( [drone.x,drone.y] ,[data[0].x,data[0].y] , "#000000" , 2)
    stroke ( [drone.x,drone.y] ,[data[1].x,data[1].y] , "#000000" , 2)

    dx = (sight[0][0] - sight[1][0]) / 10;
    dy = (sight[0][1] - sight[1][1]) / 10;

    oran = 0;
    toplam = 0;

    startPoint = {isFind : false, pos : [] }
    endPoint = {isFind : false, pos : [] }

    for (i =0; i < 10; i+=0.01) {

        x = sight[0][0] - dx*i
        y = sight[0][1] - dy*i

        isSide1 = whatSide( [drone.x,drone.y] ,  [data[0].x,data[0].y]  , [x,y] )
        isSide2 = whatSide( [drone.x,drone.y] ,  [data[1].x,data[1].y]  , [x,y] )

        toplam +=1;
        if(lastPoint)
        {
            if(isSide1>1 && isSide2<1)
            {
                if(!startPoint.isFind)
                {
                    startPoint = {isFind : true, pos : [x,y] }
                }
                stroke( lastPoint , [x,y] , 1 , "#FF0000")
                oran +=1;
            }
            else
            { 
                if(startPoint.isFind)
                {
                    if(!endPoint.isFind)
                    {
                        endPoint = {isFind : true, pos : [x,y] }
                    }
                }
                stroke( lastPoint , [x,y] , 1 , "#000000")
            }

        }
    }
    if(!endPoint.isFind)
    {
        x = sight[0][0] - dx*10
        y = sight[0][1] - dy*10
        endPoint = {isFind : true, pos : [x,y] }
    }

    lastPoint = [x,y]
    return [Math.round(oran/toplam*100)/100, startPoint , endPoint , sight ]
}


function whatSide( startPoint , endPoint  , point )
{
    return (endPoint[0] - startPoint[0]) * (point[1] - startPoint[1]) - (point[0] - startPoint[0]) * (endPoint[1] - startPoint[1])
}

function calTangents(beamCenter , drone , radius)
{
    //Calculate Tangents
    var pointDistance = {
        x: beamCenter.x - drone.x,
        y: beamCenter.y - drone.y,
        length: function () {
            return Math.sqrt(this.x * this.x + this.y * this.y)
        }
    }

    //Alpha
    var a = Math.asin(radius / pointDistance.length());
    //Beta
    var b = Math.atan2(pointDistance.y, pointDistance.x);
    //Tangent angle
    var t = b - a;
    //Tangent points
    var T1 = {
        x: beamCenter.x + radius * Math.sin(t),
        y: beamCenter.y + radius * -Math.cos(t)
    };

    t = b + a;
    var T2 = {
        x: beamCenter.x + radius * -Math.sin(t),
        y: beamCenter.y + radius * Math.cos(t)
    }
    return([T1,T2])
}

function drawBall(x,y,r,color)
{
    c.beginPath();
    c.arc(x, y, r, 0, 2 * Math.PI);
    c.fillStyle = color;
    c.strokeStyle = color;
    c.fill();
    c.stroke();
}

function drawCircle(x,y,r,color)
{
    c.beginPath();
    c.arc(x, y, r, 0, 2 * Math.PI);
    c.strokeStyle = color;
    c.stroke();
}

function drawArc(x,y,r,i,j,color)
{
    c.beginPath();
    c.strokeStyle = color;
    c.lineWidth = "2";
    c.arc( x, y, r, i, j);
    c.stroke();
}
function drawElipse(x,y,rx,ry,i,j,color)
{
    c.beginPath();
    c.strokeStyle = color;
    c.lineWidth = "2";
    c.ellipse( x, y, rx,ry,0, i, j);
    c.stroke();
}
function paint(i,j,color,px,py)
{
    c.fillStyle = color
    c.fillRect(i-px/2, j-py/2,px, py);
}

function stroke ( dot1 , dot2 , size , color)
{
    c.beginPath();
    c.strokeStyle = color;
    c.lineWidth = size;
    
    c.lineTo(dot1[0],dot1[1]);
    c.lineTo(dot2[0],dot2[1]);
    c.stroke();
}


animate();
init();
