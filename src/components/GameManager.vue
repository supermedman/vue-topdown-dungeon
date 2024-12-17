<script lang="ts">
import { defineComponent } from 'vue';

import MapDisplay from './MapDisplay.vue';

import level_one from '../levels/level1.json';

import { createLevel } from '../utils/LevelFactory';

import { TileData, MapTile, CellData, CellManager } from '../typing/Tiles'; // 

const emptyTile = new MapTile({ id: 0, connections: [["", 0]]});
const emptyCell = new CellData({ id: 0, connections: [["", 0]]});

export default defineComponent({
    components: {
        MapDisplay
    },
    data() {
        return {
            tiles: [...level_one.map(l => new TileData(l))],
            mapController: new CellManager(),
            watchedCells: [emptyCell],
            activeTile: emptyTile,
            activeConnections: {
                N: false,
                E: false,
                S: false,
                W: false
            },
            levelLoaded: false
        }
    },
    methods: {
        loadLevel(){
            if (!this.levelLoaded) this.levelLoaded = true;
            else return;

            console.log('Map Tiles Loaded: %d', this.mapController.populateBase(createLevel({ dim: 4 })));
            // this.mapController.debugTiles();
            // this.mapController.debugCells();
            console.log('Map Cells Loaded: %d', this.mapController.populateCells());

            // NEW
            this.activeTile = this.mapController.activeData;
            // NEW
            this.updateMoveState();
        },
        resetLevel(){
            if (this.levelLoaded) this.levelLoaded = false;
            else return;

            this.mapController.PURGE();

            this.activeTile = emptyTile;
            this.clearActiveConnections();
        },
        move(direction: string){
            // NEW
            this.mapController.handleMovement(direction);

            this.activeTile = this.mapController.activeData;
            // NEW

            // OLD
            // const nextTileID = this.activeTile.moveDirectionsID(direction);

            // this.activeTile = new MapTile(this.tiles.find(t => t.id === nextTileID) ?? emptyTile);

            this.updateMoveState();
            // OLD
        },
        clearActiveConnections() {
            this.activeConnections.N = false;
            this.activeConnections.E = false;
            this.activeConnections.S = false;
            this.activeConnections.W = false;
        },
        updateMoveState(){
            if (!this.mapController || this.mapController.levelTiles.length <= 0) return console.warn('Level is not loaded!');
            
            //const movementFilter = (k: string) => this.mapController.activeTile?.enabledConnections().some((d) => k === d);
            const movementFilter = this.mapController.filterMovement();
            
            // console.log('Before connections cleared and updated: ', this.activeConnections);

            this.clearActiveConnections();
            Object.entries(this.activeConnections)
            .filter(([k,]) => movementFilter(k))
            .reduce((acc, [k,]) => {
                this.activeConnections[k] = true;
                return acc;
            }, {});

            console.log(
                'After connections cleared and updated: \nN: %s \nE: %s \nS: %s \nW: %s', 
                this.activeConnections.N,
                this.activeConnections.E,
                this.activeConnections.S,
                this.activeConnections.W
            );

            this.watchedCells = [...this.mapController.cells];

            // OLD
            // if (!this.activeTile) return console.warn('Level is not loaded!');

            // console.log(this.activeTile);

            // const canMoveTo = (k: string) => this.activeTile.enabledConnections().some((d) => k === d);

            // console.log('Before connections cleared and updated: ', this.activeConnections);

            // this.clearActiveConnections();

            // Object.entries(this.activeConnections)
            // .filter(([k,]) => canMoveTo(k))
            // .reduce((acc, [k,]) => {
            //     this.activeConnections[k] = true;
            //     return acc;
            // }, {});

            // console.log('After connections cleared and updated: ', this.activeConnections);
            // OLD
        },
        testFn() {
            createLevel({ dim: 4 });
        }
    }
})
</script>

<!--<span :hidden="!levelLoaded" v-for="tile in tiles">{{ tile.connections }}</span>-->

<!-- 
:active-data="activeTile" 
    :level-data="tiles" 
    :map-manager="mapController" 
-->
<template>
    <MapDisplay 
    :hidden="!levelLoaded" 
    :level-cells="watchedCells"
    ></MapDisplay>
    <div class="game-state-controls">
        <button style="button" :disabled="levelLoaded" @click="loadLevel">Start!</button>
        <button style="button" :disabled="!levelLoaded" @click="resetLevel">Reset!</button>
        <button style="button" @click="testFn">GEN LEVEL</button>
        
        <button style="button" :disabled="!activeConnections.W" @click="move('W')"><</button>
        <button style="button" :disabled="!activeConnections.N" @click="move('N')">^</button>
        <button style="button" :disabled="!activeConnections.S" @click="move('S')">v</button>
        <button style="button" :disabled="!activeConnections.E" @click="move('E')">></button>
    </div>
</template>