let inputDOM = document.querySelector("#file")
let paletteDOM = document.querySelector("#palette")
let canvas = document.querySelector("canvas")
let button = document.querySelector("button")
let ctx = canvas.getContext("2d")
button.addEventListener("click", () => {
    palette = Array.from(paletteDOM.value.match(/#[a-f\d]{1,6}/gi)).map(hex => {
        let red, green, blue
        if (hex.length == 7) {
            red = parseInt(hex.slice(1, 3), 16)
            green = parseInt(hex.slice(3, 5), 16)
            blue = parseInt(hex.slice(5, 7), 16)
        } else if (hex.length == 4) {
            red = parseInt(hex[1].repeat(2), 16)
            green = parseInt(hex[2].repeat(2), 16)
            blue = parseInt(hex[3].repeat(2), 16)
        } else if (hex.length == 3) {
            red = green = blue = parseInt(hex.slice(1, 3), 16)
        } else if (hex.length == 2) {
            red = green = blue = parseInt(hex[1].repeat(2), 16)
        }
        return new Color(red, green, blue)
    })
    let file = inputDOM.files[0]
    let reader = new FileReader()
    let image = new Image()
    image.alt = "image error"
    reader.onload = ev => {
        document.body.append(image)
        image.src = ev.target.result
        image.onload = () => drawEvent(image)
        image.remove()
    }
    reader.readAsDataURL(file)
})

class Color {
    constructor(red, green, blue) {
        this.red = red
        this.green = green
        this.blue = blue
    }
    add(other) {
        this.red += other.red
        this.green += other.green
        this.blue += other.blue
        return this
    }
    sub(other) {
        this.red -= other.red
        this.green -= other.green
        this.blue -= other.blue
        return this
    }
    normalize() {
        this.red = this.red < 0 ? 0 : this.red > 255 ? 255 : Math.round(this.red)
        this.green = this.green < 0 ? 0 : this.green > 255 ? 255 : Math.round(this.green)
        this.blue = this.blue < 0 ? 0 : this.blue > 255 ? 255 : Math.round(this.blue)
        return this
    }
    scaleCopy(value) {
        return new Color(this.red * value, this.green * value, this.blue * value)
    }
    sqareDistance() {
        return this.red ** 2 + this.green ** 2 + this.blue ** 2
    }
    copy() {
        return new Color(this.red, this.green, this.blue)
    }
}

let palette = [new Color(0, 0, 0)]

/** @param {Color} color @returns {Color} */
function findClosest(color) {
    let lowestDiff = Infinity
    let bestColor
    for (let sample of palette) {
        let tempColor = color.copy()
        let testColor = sample
        let offset = tempColor.sub(testColor).sqareDistance()
        if (offset < lowestDiff) {
            lowestDiff = offset
            bestColor = testColor
        }
    }
    return bestColor
}

function getIndex(dataMap, x, y, width) {
    let index = x * 4 + width * 4 * y
    if (index >= dataMap.length) {return null}
    return index
}

function setPixelAtIndex(dataMap, index, color) {
    if (dataMap[index] == undefined) return
    dataMap[index] = color.red
    dataMap[index + 1] = color.green
    dataMap[index + 2] = color.blue
}

function drawEvent(image) {
    ctx.imageSmoothingEnabled = false
    let canvasWidth = canvas.width
    let canvasHeight = canvas.height
    let scaleWidth = image.width / canvasWidth
    let scaleHeight = image.height / canvasHeight
    let newWidth = scaleWidth > scaleHeight ? canvasWidth : Math.round(image.width * canvasHeight / image.height)
    let newHeight = scaleHeight > scaleWidth ? canvasHeight : Math.round(image.height * canvasWidth / image.width)
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)
    ctx.drawImage(image, 0, 0, newWidth, newHeight)
    let canvasData = ctx.getImageData(0, 0, newWidth, newHeight)
    let data = canvasData.data
    for (let i = 0; i < newHeight; i++) {
        for (let j = 0; j < newWidth; j++) {
            let currentIndex = getIndex(data, j, i, newWidth)
            let currentColor = new Color(data[currentIndex], data[currentIndex + 1], data[currentIndex + 2])
            let newColor = findClosest(currentColor)
            setPixelAtIndex(data, currentIndex, newColor)
            let quantError = currentColor.sub(newColor) //techincally currentColor variable again (mutates)
            //following write order is E, SW, S, SE
            let xOff = [1, -1, 0, 1]
            let yOff = [0, 1, 1, 1]
            let scales = [7 / 16, 3 / 16, 5 / 16, 1 / 16]
            for (let loop = 0; loop < 4; loop++) {
                let nextX = j + xOff[loop]
                let nextY = i + yOff[loop]
                let nextScale = scales[loop]
                let nextIndex = getIndex(data, nextX, nextY, newWidth)
                let nextColor = new Color(data[nextIndex], data[nextIndex + 1], data[nextIndex + 2])
                nextColor.add(quantError.scaleCopy(nextScale))
                setPixelAtIndex(data, nextIndex, nextColor)
            }
        }
    }
    ctx.putImageData(canvasData, 0, 0)
}