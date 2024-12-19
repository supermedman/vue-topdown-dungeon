<script lang="ts">
import { defineComponent } from 'vue';
import { RawTile } from '../typing/Tiles';
import { cellCycle, convertToRawTiles, LevelCell } from '../utils/LevelFactory';

const DIM = 4;

export default defineComponent({
    data() {
        return {
            gameMap: () => {
                return document.querySelector("canvas");
            },
            storedLevel: (level: Array<LevelCell>): Array<RawTile> => {
                return convertToRawTiles(level);
            },
            levelCells: Array.from([...new Array(DIM * DIM).fill(0)].map((_, idx, arr) => arr[idx] = new LevelCell(idx, undefined))),
            defaultCells: () => {
                return Array.from([...new Array(DIM * DIM).fill(0)].map((_, idx, arr) => arr[idx] = new LevelCell(idx, undefined)))
            },
        }
    },
    methods: {
        cycleCell() {
            this.levelCells = cellCycle(this.levelCells, DIM);
            this.renderLevel();
        },
        resetLevel() {
            this.levelCells = this.defaultCells();
            this.renderLevel();
        },
        renderLevel() {
            const c = this.gameMap();
            // Load canvas context, abort render if canvas failed to return
            const ctx = (c?.getContext) 
            ? c?.getContext('2d')
            : undefined;
            if (!ctx || !c) return;

            const levelTiles = this.storedLevel(this.levelCells);

            console.log(levelTiles);

            const h = c.height / DIM;
            const w = c.width / DIM;

            let idTrack = 1;
            for (let j = 0; j < DIM; j++){
                for (let i = 0; i < DIM; i++){
                    let cell = levelTiles.find(t => t.id === idTrack);
                    if (!cell) {
                        idTrack++;
                        continue;
                    }

                    // if (cell.activeCell){
                    //     // This is representing the players current position, defined by cell.activeCell
                    //     ctx.fillStyle = 'green';
                    // } else if (cell.hasContents && cell.contents[0]) {
                    //     // Cell contains interactable element?
                    //     switch(cell.contents[0].type){
                    //         case 1:
                    //             ctx.fillStyle = 'darkRed';
                    //         break;
                    //         case 2:
                    //             ctx.fillStyle = 'gold';
                    //         break;
                    //         case 3:
                    //             ctx.fillStyle = 'purple';
                    //         break;
                    //     }
                    // } else ctx.fillStyle = 'grey';

                    ctx.fillStyle = 'grey';
                    // Draw cell using decided colour
                    ctx.fillRect(i * w, j * h, w, h);

                    // Draw connectors as small red/green squares
                    // For each tile, draw each connection:
                    // If !dir red square, otherwise green square

                    // connectionHeight & connectionWidth: (Alias) cH & cW
                    // Used for scaling connection squares to 1/4 the size of a map cell
                    const cH = h / 4;
                    const cW = w / 4;

                    const staticDirList = ["N", "E", "S", "W"];
                    const connectedCellData = cell.connections.map(([dir,]) => dir);

                    for (const statDir of staticDirList){
                        ctx.fillStyle = (!connectedCellData.includes(statDir))
                        ? 'red'
                        : 'lightgreen';

                        if (connectedCellData[0] === "") ctx.fillStyle = 'grey';
                        
                        switch(statDir){
                            case "N":
                                ctx.fillRect(cW * 1.5 + (i * w), j * h, cW, cH);
                            break;
                            case "E":
                                ctx.fillRect(cW * 3 + (i * w), cH * 1.5 + (j * h), cW, cH);
                            break;
                            case "S":
                                ctx.fillRect(cW * 1.5 + (i * w), cH * 3 + (j * h), cW, cH);
                            break;
                            case "W":
                                ctx.fillRect(i * w, cH * 1.5 + (j * h), cW, cH);
                            break;
                        }
                    }

                    // for (const conDir of cell.connections){
                    //     const [dir] = conDir; // , id
                    //     ctx.fillStyle = 'lightgreen';
                    //     switch(dir){
                    //         case "N":
                    //             ctx.fillRect(cW * 1.5 + (i * w), j * h, cW, cH);
                    //         break;
                    //         case "E":
                    //             ctx.fillRect(cW * 3 + (i * w), cH * 1.5 + (j * h), cW, cH);
                    //         break;
                    //         case "S":
                    //             ctx.fillRect(cW * 1.5 + (i * w), cH * 3 + (j * h), cW, cH);
                    //         break;
                    //         case "W":
                    //             ctx.fillRect(i * w, cH * 1.5 + (j * h), cW, cH);
                    //         break;
                    //     }
                    // }

                    idTrack++;
                }
            }
        }
    }
})

</script>

<template>
    <canvas id="game-map" height="400" width="400" alt="Game Map"></canvas>
    <button style="button" @click="resetLevel">Start Over</button>
    <button style="button" @click="cycleCell">Draw Step</button>
</template>