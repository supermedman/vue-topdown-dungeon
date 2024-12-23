<script lang="ts">
import { defineComponent } from 'vue';


export default defineComponent({
    emits: ['updateDimension'],
    data(){
        return {
            levelLoaded: false,
            dimValue: 8
        }
    },
    props: {
        levelActive: {
            type: Boolean
        }
    },
    watch: {
        levelActive(newData: boolean, oldData: boolean) {
            if (newData === oldData) return;
            this.levelLoaded = newData;
        }
    }
});
</script>

<template>
    <div id="level-gen-options">
        <div :hidden="levelLoaded">
            <input type="radio" id="dimOne" name="dimOption" :value="8" checked
            v-model.number="dimValue"
            @change="$emit('updateDimension', dimValue)"
            />
            <label for="dimOne">8x8</label>
        </div>
        <div :hidden="levelLoaded">
            <input type="radio" id="dimTwo" name="dimOption" :value="10" 
            v-model.number="dimValue"
            @change="$emit('updateDimension', dimValue)"
            />
            <label for="dimTwo">10x10</label>
        </div>
        <div :hidden="levelLoaded">
            <input type="radio" id="dimThree" name="dimOption" :value="12" 
            v-model.number="dimValue"
            @change="$emit('updateDimension', dimValue)"
            />
            <label for="dimThree">12x12</label>
        </div>
        <div :hidden="levelLoaded">
            <input type="radio" id="dimFour" name="dimOption" :value="16" 
            v-model.number="dimValue"
            @change="$emit('updateDimension', dimValue)"
            />
            <label for="dimFour">16x16</label>
        </div>
    </div>
</template>