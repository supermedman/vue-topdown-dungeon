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
    <div id="level-gen-container">
        <div :hidden="levelLoaded" class="level-gen-header">
            <h3>Dimensions</h3>
        </div>
        <div class="level-gen-options">
            <label :hidden="levelLoaded" class="option-label-container" for="dimOne">8x8
                <input :hidden="levelLoaded" type="radio" id="dimOne" name="dimOption" :value="8" checked
                v-model.number="dimValue"
                @change="$emit('updateDimension', dimValue)"
                />
                <span class="option-selector"></span>
            </label>
            <label :hidden="levelLoaded" class="option-label-container" for="dimTwo">10x10
                <input type="radio" id="dimTwo" name="dimOption" :value="10" 
                v-model.number="dimValue"
                @change="$emit('updateDimension', dimValue)"
                />
                <span class="option-selector"></span>
            </label>
            <label :hidden="levelLoaded" class="option-label-container" for="dimThree">12x12
                <input type="radio" id="dimThree" name="dimOption" :value="12" 
                v-model.number="dimValue"
                @change="$emit('updateDimension', dimValue)"
                />
                <span class="option-selector"></span>
            </label>
            <label :hidden="levelLoaded" class="option-label-container" for="dimFour">16x16
                <input type="radio" id="dimFour" name="dimOption" :value="16" 
                v-model.number="dimValue"
                @change="$emit('updateDimension', dimValue)"
                />
                <span class="option-selector"></span>
            </label>
        </div>
    </div>
</template>