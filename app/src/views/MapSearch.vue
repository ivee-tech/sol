<template>
  <section>
    <div style="padding-left: 30px">
      <input id="txtSearch" type="text" />
      <button v-on:click="search">Search</button>
    </div>
    <br /><br />
    <div class="map" id="divMap" style='width: 100vw; height: 100vh;'>
    </div>
  </section>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';


declare const Microsoft: any;

@Component<MapSearch>({
  components: {
  },
  mounted: function () {
    this.onMounted();
  },
})
export default class MapSearch extends Vue {

  private map;
  private infobox;
  private data: any[] = [];

  private fileNames = [
    'Dan R\'s Story.json',
    'Dougs Story.json',
    'Gail\'s Story.json',
    'Heni OHare.json',
    'Jason\'s Story.json',
    'John O\'Hare.json',
    'Jons Story.json',
    'Lucy.json',
    'Lyn\'s korero.json',
    'Pauline Owen.json',
    'Tahu\'s Story.json',
  ];

  private onMounted() {
    // const urlParams = new URLSearchParams(window.location.search);
    // this.q = urlParams.get('q');
    (window as any).onLoadBingMapsApi = () => this.loadMap();
    this.fileNames.map(fn => {
      this.loadData(fn);
    });
  }


  loadData(fileName) {
    const $path = `./assets/stories/${fileName}`;
    fetch($path).then(response => {
      response.json().then(d => {
        this.data.push(d);
    });
});

  }

  loadMap(): void {
      this.map = new Microsoft.Maps.Map(
          document.getElementById('divMap'),
          {
              credentials: '***',
          }
      );
    this.infobox = new Microsoft.Maps.Infobox(this.map.getCenter(), { title: 'Map Center', description: '', visible: false,
      maxHeight: 500, maxWidth: 500,
      actions: [
        { label: 'Play', eventHandler: function () { alert('Play video.'); } }
      ] });
    this.infobox.setMap(this.map);
    }

    search() {
      const q = (document.getElementById('txtSearch') as HTMLInputElement).value;
      const re = new RegExp(q, 'i');
      const results = this.data.filter(d => d.keyPhraseResults[0].keyPhrases.filter(kp => re.test(kp)).length > 0);
      console.log(results);
      results.map(r => {
        if(r.updatedLocation) {
          const pin = new Microsoft.Maps.Pushpin(r.updatedLocation, { color: '#0f0' });
          this.map.entities.push(pin);
          Microsoft.Maps.Events.addHandler(pin, 'click', (e) => {
              this.infobox.setOptions({ 
                location: e.target.getLocation(), 
                visible: true, 
                title: r.fileName.substring(0, r.fileName.length - '.txt'.length),
                description: r.storyUpdatedText });
          });
        }
      });
      if(results[0] && results[0].updatedLocation) {
        this.map.setView({ center: results[0].updatedLocation, zoom: 8 });
      }
    }
}
</script>
