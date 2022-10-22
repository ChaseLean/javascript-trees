var canvas = document.getElementById("tree-canvas");
var canvas2 = document.getElementById("back-canvas");

const BACKGROUND = "radial-gradient(circle at 100% 0%, rgb(185, 185, 230), rgb(170, 170, 180))";
const COLORS = {
    "branch"        : {value: "hsl(20, 29%, lightness%)", base: 24}, 
    "leaf"          : {value: "hsl(100, 40%, lightness%)", base: 50}, 
    "pinkFlower"    : {value: "hsl(330, 60%, lightness%)", base: 80}, 
    "autumnLeaf"    : {value: "hsl(20, 70%, lightness%)", base: 65},
    "sky"           : {value: "hsla(190, 100%, lightness%, 0.2)", base: 60}
};

const CANVASHEIGHT = 1;
const ITERATIONS = 10;
const THICKNESS = 25;
const BRANCHFACTOR = 10;
const BRANCHLENGTH = 40;
const LUSHNESS = 0.2;
const FALLENPETALRATIO = 0.2;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight * CANVASHEIGHT;
canvas2.width = window.innerWidth;
canvas2.height = window.innerHeight * CANVASHEIGHT;

var c = canvas.getContext('2d');
var c2 = canvas2.getContext('2d');

canvas.style.background = "transparent";
canvas2.style.background = BACKGROUND;

console.log(canvas, canvas2);

class Branch {
    constructor(center_x, center_y, x, y, maxSize, generation, slant, control) {
        this.center = {x: center_x, y: center_y};
        this.start = {x: x, y: y};
        this.maxSize = maxSize;
        this.generation = generation;
        this.slant = slant;
        this.control = control;
        this.nextControl = undefined;
        this.end = undefined;
        
        this.thickness = (maxSize - this.generation) ** 1.8 / maxSize ** 1.8 * THICKNESS;

        this.createControlPoint = function(){
            var controlAngle = this.slant + (Math.random() - 0.5) * Math.PI / 10;
            var delta = -BRANCHLENGTH;
            this.control = this.rotatePoint(this.start, {x: this.start.x, y: this.start.y + delta}, controlAngle);
        }

        this.endPoint = function(){
            var angleJitter = (Math.random() - 0.5) * 0.1;
            var t = 2;
            var x_prime = this.start.x + (this.control.x - this.start.x) * t;
            var y_prime = this.start.y + (this.control.y - this.start.y) * t;
            this.end = this.rotatePoint(this.start, {x: x_prime, y: y_prime}, this.slant + angleJitter);
        }

        this.nextControlPoint = function(){
            var lengthJitter = 1 + (Math.random() - 0.5) * 0.5 * -this.generation * (this.generation - this.maxSize) / maxSize;
            var length = (maxSize - this.generation) ** 1 / maxSize ** 1 * BRANCHLENGTH * lengthJitter;
            var tangentVector = this.getTangentVector();
            var x_prime = this.end.x + tangentVector.x * length;
            var y_prime = this.end.y + tangentVector.y * length;
            this.nextControl = {x: x_prime, y: y_prime};
        }

        this.rotatePoint = function (center, target, angle) {
            var x = target.x - center.x;
            var y = target.y - center.y
            var x_prime = x * Math.cos(angle) - y * Math.sin(angle);
            var y_prime = x * Math.sin(angle) + y * Math.cos(angle);
            return {x: x_prime + center.x, y: y_prime + center.y};
        };

        this.getNorm = function(u){
            return Math.sqrt(u.x ** 2 + u.y ** 2);
        }

        this.normalize = function(u){
            var norm = this.getNorm(u);
            return {x: u.x/norm, y: u.y/norm};
        }

        this.getAngle = function(u, v){
            return Math.asin((u.x * v.y - v.x * u.y) / (this.getNorm(u) * this.getNorm(v)));
        }

        this.getTangentVector = function(){
            return this.normalize({
                x: this.end.x - this.control.x,
                y: this.end.y - this.control.y
            });
        }

        this.getNormalVector = function(){
            return this.normalize({
                x: (this.end.x + this.control.y - this.end.y) - this.end.x,
                y: (this.end.x - this.control.x + this.end.y) - this.end.y
            });
        }

        this.interpolateCurve = function(start, control, end, t){
            var x = (1-t) ** 2 * start.x + 2 * (1-t) * t * control.x + t ** 2 * end.x;
            var y = (1-t) ** 2 * start.y + 2 * (1-t) * t * control.y + t ** 2 * end.y;
            return {x: x, y: y};
        }
        

        this.spawnBranch = function() {

            var seed = Math.random();
            var branchCountModifier =  1 / (this.generation + 1);
            var maxBranchCount = Math.round(Math.log(1 - seed) / (- 100 / BRANCHFACTOR * branchCountModifier) + 2);
            var branchCount = Math.min(this.generation + 2, maxBranchCount);
            var tangentVector = this.getTangentVector();
            var normalVector = this.getNormalVector();

            for(var i = 0; i < branchCount; i++){
                var positionModifier = (i - (branchCount - 1) / 2)
                var newSlant = positionModifier * Math.PI / 8;
                var agingFactor = 1;

                if(Math.random() > 0.6 && this.generation < this.maxSize - 2) agingFactor += 1;

                var thicknessOffset = this.thickness - (maxSize - (this.generation + agingFactor)) ** 1.6 / maxSize ** 1.6 * THICKNESS;
                var thicknessCoefficient = 2.2 / branchCount;

                var newStart = {
                    x: this.end.x - 2 * tangentVector.x + normalVector.x * positionModifier * thicknessOffset * thicknessCoefficient,
                    y: this.end.y - 2 * tangentVector.y + normalVector.y * positionModifier * thicknessOffset * thicknessCoefficient
                }
                new Branch(this.center.x, this.center.y, newStart.x, newStart.y, this.maxSize, this.generation + agingFactor, newSlant, this.nextControl);
            }

            var sideBranchCount = (this.generation) ** 3 / this.maxSize ** 2 * 0.05 * BRANCHFACTOR;
            for(var i = 0; i < sideBranchCount; i++){
                if(Math.random() > Math.exp(-(this.generation / 3))){
                    var t = 0.2 + 0.6 * (i / sideBranchCount);
                    var newStart = this.interpolateCurve(this.start, this.control, this.end, t);
                    var angle = Math.sign(Math.random() - 0.5) * (Math.random() + 1) * Math.PI / 50;
                    var agingFactor = 1;
                    if(this.generation < this.maxSize - 2) agingFactor += 1;

                    var lengthJitter = 1 + (Math.random() - 0.5) * 0.5 * -(this.generation) * (this.generation - this.maxSize) / maxSize;
                    var length = (maxSize - (this.generation)) ** 1 / maxSize ** 1 * BRANCHLENGTH * lengthJitter;
    
                    var x_prime = newStart.x + tangentVector.x * length;
                    var y_prime = newStart.y + tangentVector.y * length;
                    var newControlPoint = this.rotatePoint(newStart, {x: x_prime, y: y_prime}, angle);
                    var slant = Math.sign(Math.random() - 0.5) * (Math.random() + 1) * Math.PI / 24;
                
                    new Branch(this.center.x, this.center.y, newStart.x, newStart.y, this.maxSize, this.generation + agingFactor, angle + slant, newControlPoint);
                }
            }
        }


        this.draw = function(){
            var angle = this.getAngle({x: 0, y: -1}, this.getTangentVector());
            var shadingJitter = (Math.random() - 0.5) * 10;
            var shading = angle * 5 + (this.generation - this.maxSize) / this.maxSize * 10 + (this.start.x - this.center.x) * 0.01 + shadingJitter;

            if(this.generation == 0){
                this.drawRoot(this.start.x, this.start.y, this.thickness, shading);
            }
            if(this.generation < this.maxSize){
                var color = COLORS.branch.value.replace("lightness", COLORS.branch.base + shading);
                this.drawBranch(this.start.x, this.start.y, this.control.x, this.control.y, this.end.x, this.end.y, this.thickness, color);
            }
            if(this.generation == this.maxSize && Math.random() < LUSHNESS){
                var radius = Math.random() * 5 + 1;
                var color = COLORS.pinkFlower.value.replace("lightness", COLORS.pinkFlower.base + shading * 1.5);
                this.drawFlower(this.end.x, this.end.y, radius, color);
                if(Math.random() < FALLENPETALRATIO) this.drawFallenPetal(this.end.x, this.end.y, radius, color);
            }
            if(this.thickness > 10){
                this.drawNoise(this.start.x, this.start.y, this.control.x, this.control.y, this.end.x, this.end.y, this.thickness, shading);
            }
        }

        this.drawBranch = function(x0, y0, x1, y1, x2, y2, thickness, color){
            c.strokeStyle = color;
            c.lineWidth = thickness;
            c.beginPath();
            c.moveTo(x0, y0);
            c.quadraticCurveTo(x1, y1, x2, y2);
            c.stroke();
        }

        this.drawFlower = function(x, y, radius, color){
            // c.beginPath();
            c.fillStyle = color;
            c.arc(x, y, radius, 0, Math.PI * 2, true);
            c.fill();
        }

        this.drawFallenPetal = function(x, y, radius, color){
            var dx = Math.sign(Math.random() - 0.5) * Math.sqrt(10 * Math.log(1 / Math.random())) * 50;
            var perspective = 1 + Math.sign(Math.random() - 0.5) * Math.sqrt(0.02 * Math.log(1 / Math.random()))  + (Math.random() - 0.5) * 0.2;
            var dy = (this.center.y - y) * perspective;
            var radius_x = (Math.random() * 0.4 + 0.8) * radius * perspective ** 1.2;
            var radius_y = (Math.random() * 0.2 + 0.4) * radius * perspective ** 1.2;
            var angle = (Math.random() - 0.5) * 0.5;

            c2.strokeStyle = "transparent";
            c2.fillStyle = color;
            c2.beginPath();
            c2.moveTo(x + dx, y + dy);
            c2.ellipse(x + dx, y + dy, radius_x, radius_y, angle, 0, Math.PI * 2, true);
            c2.fill();
            c2.stroke();
        }

        this.drawRoot = function(x, y, thickness, shading){
            var count = thickness / 2;
            for(var i = 0; i < count; i++){
                var deviation = (count / 2 - i) / (count / 2);
                var position = {x: x - deviation * 30 * thickness / 20, y: y - Math.exp(-1 * deviation ** 2) * 3 + Math.random() * 5};
                var radius_x = (Math.random() * 0.1 + 0.3) * thickness * Math.exp(-1 * deviation ** 2);
                var radius_y = (Math.random() * 0.05 + 0.15) * thickness * Math.exp(-1 * deviation ** 2);
                c.strokeStyle = "transparent";
                c.fillStyle = COLORS.branch.value.replace("lightness", COLORS.branch.base + shading * 0.75 + (Math.random() - 0.5) * 10);
                c.beginPath();
                c.ellipse(position.x, position.y, radius_x, radius_y, 0, 0, Math.PI * 2, true);
                c.fill();
                c.stroke();
            }
        }

        this.drawNoise = function(x0, y0, x1, y1, x2, y2, thickness, shading){
            var count = 50;
            for(var i = 0; i < count; i++){
                var position = this.interpolateCurve({x: x0, y: y0}, {x: x1, y: y1}, {x: x2, y: y2}, i / count);
                position.x += (Math.random() - 0.5) * thickness / 2;
                position.y += (Math.random() - 0.5) * thickness / 2;
                var radius_x = Math.random() * thickness / 4;
                var radius_y = Math.random()* thickness / 4;
                c.strokeStyle = "transparent";
                c.fillStyle = COLORS.branch.value.replace("lightness", COLORS.branch.base + shading * 0.75 + (Math.random() - 0.5) * 10);
                c.beginPath();
                c.ellipse(position.x, position.y, radius_x, radius_y, 0, 0, Math.PI * 2, true);
                c.fill();
                c.stroke();
            }
        }
        
        if(this.generation == 0) this.createControlPoint();
        this.endPoint();
        this.nextControlPoint();
        this.draw();
        if(this.generation < this.maxSize) this.spawnBranch();
    }
}

var spawnTree = function(){
    new Branch(innerWidth / 2, innerHeight * CANVASHEIGHT - 50, innerWidth / 2, innerHeight * CANVASHEIGHT - 50, ITERATIONS, 0, 0, undefined);
}

window.addEventListener("click",
    function(){
        c.clearRect(0, 0, innerWidth, innerHeight * CANVASHEIGHT);
        c2.clearRect(0, 0, innerWidth, innerHeight * CANVASHEIGHT);
        spawnTree();
    }
)

spawnTree();