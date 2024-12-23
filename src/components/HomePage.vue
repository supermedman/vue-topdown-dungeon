<script lang="ts">
import { defineComponent } from 'vue';


export default defineComponent({
    emits: ['changePage']
});
</script>

<template>
    <div>
        <h1>Dungeons of Fayrn</h1>
    </div>
    <div>
        <button @click="$emit('changePage', 'GameManager')">Play</button>
        <button @click="$emit('changePage', 'PageTwo')">Option Two</button>
        <button @click="$emit('changePage', 'PageThree')">Option Three</button>
    </div>
</template>