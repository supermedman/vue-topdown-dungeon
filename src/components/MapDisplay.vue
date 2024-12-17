<script lang="ts">

import { CellData } from '../typing/Tiles'; //  TileData, MapTile,  CellManager
// import { getTypeOf } from '../utils/LogicHelpers';

// Used to silence type errors by filling default values with empty class constructors
// const emptyTile = new TileData({ id: 0, connections: [["", 0]]});
const emptyCell = new CellData({ id: 0, connections: [["", 0]]});

export default {
    data() {
        return {
            gameMap: () => {
                return document.querySelector("canvas");
            },
            cellStorage: [emptyCell],
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
            const DIM = Math.log2(this.$props.levelCells?.length ?? 4);

            // Defining the draw size of a single map cell
            const h = c.height / DIM;
            const w = c.width / DIM;

            console.log(`Current canvas grid dimensions: DIM:${DIM} H:${h}, W:${w}`);

            // Retrieving level data, or anything thats been passed down to this component from the game manager
            // this.cellStorage = this.$props.mapManager?.tiledCells ?? [emptyCell];

            console.log('Cell data updated values: ', ...this.cellStorage);

            let idTrack = 1;
            for (let j = 0; j < DIM; j++){
                for (let i = 0; i < DIM; i++){
                    let cell = this.cellStorage.find(t => t.id === idTrack);
                    if (!cell) {
                        idTrack++;
                        continue;
                    }

                    if (cell.activeCell){
                        // This is representing the players current position, defined by cell.activeCell
                        ctx.fillStyle = 'green';
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
    },
    mounted() {
        this.gameMap();
    },
}
</script>

<template>
    <canvas id="game-map" height="400" width="400" alt="Game Map"></canvas>
</template>