<script lang="ts">
import lilDude from '../assets/pixil-frame-0.png';
import { defineComponent } from 'vue';
import { CellData } from '../typing/Tiles'; //  TileData, MapTile,  CellManager
// import { getTypeOf } from '../utils/LogicHelpers';

// Used to silence type errors by filling default values with empty class constructors
// const emptyTile = new TileData({ id: 0, connections: [["", 0]]});
const emptyCell = new CellData({ id: 0, connections: [["", 0]]});

export default defineComponent({
    data() {
        return {
            gameMap: () => {
                return document.querySelector("canvas");
            },
            cellStorage: [emptyCell],
            unreachableCells: [emptyCell],
            hiddenCells: [emptyCell],
            // storedCells: (newData: Array<TileData>, activeID?: number) => {
            //     const newlyMappedData = [...newData.map(t => new CellData(t))];
            //     if (activeID) {
            //         (newlyMappedData.find(t => t.id === activeID) ?? newlyMappedData[0]).activeCell = true;
            //     }
            //     return newlyMappedData;
            // }
        }
    },
    props: {
        levelCells: {
            type: Array<CellData>
        },
        blockedCells: {
            type: Array<CellData>
        },
        unknownCells: {
            type: Array<CellData>
        },
        debugMode: {
            type: Boolean
        },
        deConIDS: {
            type: Boolean
        },
        deConStates: {
            type: Boolean
        },
        deCellIDS: {
            type: Boolean
        },
        deCellPathing: {
            type: Boolean
        }
        // mapManager: {
        //     type: CellManager
        // },
        // levelData: {
        //     type: Array<TileData>
        // },
        // activeData: {
        //     type: MapTile
        // }
    },
    watch: {
        levelCells(newData: Array<CellData>, oldData: Array<CellData>) {
            if (!newData.length || newData === oldData) return;

            console.log('CellData contents changed, attempting to update stored data...');
            
            this.cellStorage = this.$props.levelCells ?? [emptyCell];

            console.log('CellData updated, attempting to render content...');

            this.renderGameMap();
        },
        blockedCells(newData: Array<CellData>, oldData: Array<CellData>) {
            if (!newData.length || newData === oldData) return;

            console.log('Blocked CellData contents changed, attempting to update stored data...');
            
            this.unreachableCells = this.$props.blockedCells ?? [emptyCell];

            console.log('Blocked CellData updated, attempting to render content...');

            this.renderGameMap();
        },
        unknownCells(newData: Array<CellData>, oldData: Array<CellData>) {
            if (!newData.length || newData === oldData) return;

            console.log('Unknown CellData contents changed, attempting to update stored data...');
            
            this.hiddenCells = this.$props.unknownCells ?? [emptyCell];

            console.log('Unknown CellData updated, attempting to render content...');

            this.renderGameMap();
        },
        debugMode(newData: boolean, oldData: boolean) {
            if (newData === oldData) return;

            console.log('Debug state changed, attempting to render content...');

            this.renderGameMap();
        },
        deConIDS(newData: boolean, oldData: boolean){
            if (newData === oldData) return;

            console.log('Debug state changed, attempting to render content...');

            this.renderGameMap();
        },
        deConStates(newData: boolean, oldData: boolean){
            if (newData === oldData) return;

            console.log('Debug state changed, attempting to render content...');

            this.renderGameMap();
        },
        deCellIDS(newData: boolean, oldData: boolean){
            if (newData === oldData) return;

            console.log('Debug state changed, attempting to render content...');

            this.renderGameMap();
        },
        deCellPathing(newData: boolean, oldData: boolean){
            if (newData === oldData) return;

            console.log('Debug state changed, attempting to render content...');

            this.renderGameMap();
        },
        // activeData(newData: MapTile, oldData: MapTile | null) {
        //     // console.log('DATA UPDATED IN MAPDISPLAY: ', newData);
        //     // console.log('Old data value: ', oldData);
        //     console.log('MapTile data changed! \nOLD ID: %d \nNEW ID: %d', oldData?.id ?? 0, newData.id);
        //     this.renderGameMap();
        // },
        // levelData(newData: Array<TileData>, oldData: Array<TileData> | null) {
        //     //console.log('New Level Data: ', ...newData);
        //     console.log('`tiles` data updated, OLD: ', oldData);
        //     if (!oldData) return;

        //     this.cellStorage = this.storedCells(newData, this.$props.activeData?.id);

        //     console.log('Updated CellData: ', ...this.cellStorage);
        // }
    },
    methods: {
        renderGameMap() {
            const c = this.gameMap();
            // Load canvas context, abort render if canvas failed to return
            const ctx = (c?.getContext) 
            ? c?.getContext('2d')
            : undefined;
            if (!ctx || !c) return;

            // console.log(this.$props.levelData?.length);

            // The Dimensions of our level are defined by the total tile count / 2
            // This will need to be dynamically set/calculated when map gen is implemented
            const DIM = Math.sqrt(this.$props.levelCells?.length ?? 4);

            // Defining the draw size of a single map cell
            const h = c.height / DIM;
            const w = c.width / DIM;

            console.log(`Current canvas grid dimensions: DIM:${DIM} H:${h}, W:${w}`);

            // Retrieving level data, or anything thats been passed down to this component from the game manager
            // this.cellStorage = this.$props.mapManager?.tiledCells ?? [emptyCell];

            // console.log('Cell data updated values: ', ...this.cellStorage);

            let idTrack = 1;
            for (let j = 0; j < DIM; j++){
                for (let i = 0; i < DIM; i++){
                    let cell = this.cellStorage.find(t => t.id === idTrack);
                    if (!cell) {
                        idTrack++;
                        continue;
                    }

                    let drawingActiveCell = false;
                    if (cell.activeCell){
                        // This is representing the players current position, defined by cell.activeCell
                        drawingActiveCell = true;
                        ctx.fillStyle = 'grey';
                    } else if (this.$props.blockedCells?.includes(cell) || this.$props.unknownCells?.includes(cell)){
                        // Cell is blocked, cannot be traversed, hide with FOG OF WAR
                        ctx.fillStyle = 'black';
                    } else if (cell.hasContents && cell.contents[0]) {
                        // Cell contains interactable element?
                        switch(cell.contents[0].type){
                            case 1:
                                ctx.fillStyle = 'darkRed';
                            break;
                            case 2:
                                ctx.fillStyle = 'gold';
                            break;
                            case 3:
                                ctx.fillStyle = 'purple';
                            break;
                        }
                    } else ctx.fillStyle = 'grey';
                    // Draw cell using decided colour
                    
                    if (drawingActiveCell) {
                        ctx.fillRect(i * w, j * h, w, h);
                        
                        const playerImage = new Image();
                        playerImage.onload = (() => {
                            ctx.drawImage(playerImage, i * w, j * h, w, h);
                        });

                        playerImage.src = lilDude;
                    } else ctx.fillRect(i * w, j * h, w, h);

                    //console.log('Debug state: ', this.$props.debugMode);

                    // connectionHeight & connectionWidth: (Alias) cH & cW
                    // Used for scaling connection squares to 1/4 the size of a map cell
                    const cH = h / 4;
                    const cW = w / 4;

                    const staticDirList = ["N", "E", "S", "W"];
                    // This is the data we will use to determine the draw style
                    // for each of the connections, if they do not exist, draw a "wall"
                    const connectedCellData = cell.connections.map(([dir,]) => dir);

                    // Drawing "Border" giving visual context to active Cell connections
                    ctx.fillStyle = 'black';
                    for (const statDir of staticDirList){
                        let blockPath = !connectedCellData.includes(statDir);
                        if (!blockPath) {
                           const dirMatchID = cell.connections.filter(([dir,]) => dir === statDir)?.[0] ?? null;
                           if (dirMatchID && dirMatchID[1] === -1) blockPath = true;
                        }

                        // TEMP draw
                        //const hideN = true, hideE = true, hideS = true, hideW = false;

                        switch(statDir){
                            case "N":
                                ctx.fillRect(i * w, j * h, cW, cH);
                                //if (hideN) break;
                                if (blockPath) {
                                    ctx.fillRect((cW + (i * w)) - 2, (j * h) - 2, (cW * 2) + 4, cH + 4);
                                    ctx.fillStyle = 'darkgrey';
                                    ctx.fillRect(cW + (i * w), j * h, cW * 2, cH);
                                    ctx.fillStyle = 'black';
                                }
                            break;
                            case "E":
                                ctx.fillRect(cW * 3 + (i * w), j * h, cW, cH);
                                //if (hideE) break;
                                if (blockPath) {
                                    ctx.fillRect((cW * 3 + (i * w)) - 2, (cH + (j * h)) - 2, cW + 4, (cH * 2) + 4);
                                    ctx.fillStyle = 'darkgrey';
                                    ctx.fillRect(cW * 3 + (i * w), cH + (j * h), cW, cH * 2);
                                    ctx.fillStyle = 'black';
                                }
                            break;
                            case "S":
                                ctx.fillRect(cW * 3 + (i * w), cH * 3 + (j * h), cW, cH);
                                //if (hideS) break;
                                if (blockPath) {
                                    ctx.fillRect((cW + (i * w)) - 2, (cH * 3 + (j * h)) - 2, (cW * 2) + 4, cH + 4);
                                    ctx.fillStyle = 'darkgrey';
                                    ctx.fillRect(cW + (i * w), cH * 3 + (j * h), cW * 2, cH);
                                    ctx.fillStyle = 'black';
                                }
                            break;
                            case "W":
                                ctx.fillRect(i * w, cH * 3 + (j * h), cW, cH);
                                //if (hideW) break;
                                if (blockPath) {
                                    ctx.fillRect((i * w) - 2, (cH + (j * h)) - 2, cW + 4, (cH * 2) + 4);
                                    ctx.fillStyle = 'darkgrey';
                                    ctx.fillRect(i * w, cH + (j * h), cW, cH * 2);
                                    ctx.fillStyle = 'black';
                                }
                            break;
                        }
                    }


                    if (!this.$props.debugMode) {
                        idTrack++;
                        continue;
                    }

                    // ===================== DEBUGGING MODE =====================


                    // Debugging cell pathing data using a coloured overlay
                    // Display is currently dysfunctional, pathing logic is not.
                    if (this.$props.deCellPathing && cell.hasContents && cell.pathing.length > 0) {
                        console.log('Cell Pathing Enabled, current cell path: ', cell.pathing);
                        
                        // pathOffsetTracker: (Alias) pathOffT
                        const pathOffT = {
                            px: i,
                            py: j
                        };

                        for (let p = 0; p < cell.pathing.length; p++){
                            //if (p > 0) 
                            const path = cell.pathing[p];
                            const nextPath = cell.pathing[p + 1] ?? null;

                            // let pathOffset = p > 0 ? p - 1 : 0;

                            if (path === nextPath - 1){
                                ctx.fillStyle = 'blue';
                                // Draw East
                                pathOffT.px++;
                                // Draw starting at one tile to the east, backwards to the current tile position
                                ctx.fillRect(
                                    (cW * 1.5 + (pathOffT.px * w)), 
                                    (cH * 1.5 + (pathOffT.py * h)),
                                    (pathOffT.px - p) - 1 * cW, 
                                    cH
                                );
                            } else if (path === nextPath + 1){
                                ctx.fillStyle = 'red';
                                // Draw West
                                pathOffT.px--;
                                ctx.fillRect(
                                    (cW * 1.5 + (pathOffT.px * w)), 
                                    (cH * 1.5 + (pathOffT.py * h)),
                                    (pathOffT.px - p) + 1 * cW, 
                                    cH
                                );
                            } else if (nextPath - 1 < path) {
                                ctx.fillStyle = 'orange';
                                // Draw North
                                pathOffT.py++;
                                ctx.fillRect(
                                    (cW * 1.5 + (pathOffT.px * w)), 
                                    (cH * 1.5 + (pathOffT.py * h)),
                                    cW, 
                                    (pathOffT.py - p) - 1 * cH
                                );
                            } else if (nextPath - 1 > path) {
                                ctx.fillStyle = 'purple';
                                // Draw South
                                pathOffT.py++;
                                ctx.fillRect(
                                    (cW * 1.5 + (pathOffT.px * w)), 
                                    (cH * 1.5 + (pathOffT.py * h)),
                                    cW, 
                                    (pathOffT.py - p) + 1 * cH
                                );
                            } 
                        }
                    }

                    // Draw connectors as small red/green squares
                    // For each tile, draw each connection:
                    // If !dir red square, otherwise green square

                    if (this.$props.deCellIDS) {
                        ctx.fillStyle = 'white';
                        ctx.fillText(`${cell.id}`, cW * 1.5 + (i * w), cH * 1.8 + (j * h), cW);
                    }
                    
                    for (const statDir of staticDirList){
                        ctx.fillStyle = (!connectedCellData.includes(statDir))
                        ? 'red'
                        : 'lightgreen';

                        const dirMatchID = cell.connections.filter(([dir,]) => dir === statDir)?.[0] ?? null;
                        
                        const drawConIDs = this.$props.deConIDS;
                        const drawCons = this.$props.deConStates;

                        switch(statDir){
                            case "N":
                                if (drawCons) ctx.fillRect(cW * 1.5 + (i * w), j * h, cW, cH);
                                if (dirMatchID && drawConIDs) {
                                    ctx.fillStyle = 'black';
                                    ctx.fillText(`${dirMatchID[1]}`, cW * 1.5 + (i * w), j * h, cW);
                                }
                            break;
                            case "E":
                                if (drawCons) ctx.fillRect(cW * 3 + (i * w), cH * 1.5 + (j * h), cW, cH);
                                if (dirMatchID && drawConIDs) {
                                    ctx.fillStyle = 'black';
                                    ctx.fillText(`${dirMatchID[1]}`, cW * 3 + (i * w), cH * 1.5 + (j * h), cW);
                                }
                            break;
                            case "S":
                                if (drawCons) ctx.fillRect(cW * 1.5 + (i * w), cH * 3 + (j * h), cW, cH);
                                if (dirMatchID && drawConIDs) {
                                    ctx.fillStyle = 'black';
                                    ctx.fillText(`${dirMatchID[1]}`, cW * 1.5 + (i * w), cH * 3 + (j * h), cW);
                                }
                            break;
                            case "W":
                                if (drawCons) ctx.fillRect(i * w, cH * 1.5 + (j * h), cW, cH);
                                if (dirMatchID && drawConIDs) {
                                    ctx.fillStyle = 'black';
                                    ctx.fillText(`${dirMatchID[1]}`, i * w, cH * 1.5 + (j * h), cW);
                                }
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
    },
    mounted() {
        this.gameMap();
    },
});
</script>

<template>
    <canvas id="game-map" height="400" width="400" alt="Game Map"></canvas>
</template>