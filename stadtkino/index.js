
// https://openair-kino.net/
// https://ladenkino.de/programm/open-air/
// => https://www.kinoheld.de/cinema-berlin/central-kino-open-air/shows/shows?layout=shows
//
// www.alice-rooftop.de

// i want group by
// date
// location
// movie
//

function fetchCors(resource) {
  const proxy = 'https://cors-anywhere.herokuapp.com/'
  return fetch(typeof resource === 'object' ?
               Object.assign(resource, {url: proxy + resource.url}) :
               proxy + resource)
}

async function getDocument(resource) {
  const html = await fetchCors(resource).then(r => r.text());
  return new DOMParser().parseFromString(html, "text/html");
}

export async function main() {
  Promise.all([
    kinoheld('cassiopeia', 'freiluftkino-insel-im-cassiopeia', 581),
    kinoheld('hasenheide', 'freiluftkino-hasenheide', 580),
    kinoheld('pompeji', 'freiluftkino-pompeji-open-air-am-ostkreuz-berlin', 2153),
    kinoheld('open air mitte', 'central-kino-open-air', 1839),
    kinoheld('b-ware! OpenAir FMP ', 'b-ware-openair-fmp', 1657),
    kinoheld('b-ware! OpenAir Prinzessinnengarten', 'b-ware-openairprinzessinnengarten-kollektiv-neukoell', 2339),
    piffl('rehberge', 'http://www.freiluftkino-rehberge.de/index.php'),
    piffl('kreuzberg', 'http://freiluftkino-kreuzberg.de/freiluftkino_kreuzberg_english.php'),
    piffl('fhain', 'http://www.freiluftkino-berlin.de/eine_woche.php'),
  ]).then(movies => {
    const byDate = movies.flat().reduce((byDate, movie) => {
      const date = movie.date.toDateString();
      if (byDate[date]) byDate[date].push(movie);
      else byDate[date] = [movie];
      return byDate;
    }, {});
    console.log(movies)
    Object.entries(byDate).forEach(([date, movies]) => {
      const html = `<h1>${date}</h1><ul>` + movies.map(movie => {
        return `<li>${movie.location}: ${movie.title} (${movie.time})</li>`;
      }).join('\n') + '</ul>';
      document.body.innerHTML += html;
    });
  })
}

async function kinoheld(location, cinemaName, cinemaId) {
  const result = await fetchCors(`https://www.kinoheld.de/ajax/getShowsForCinemas?cinemaIds[]=${cinemaId}&lang=en`).then(r => r.json());
  return result.shows.map(show => {
    return {
      location,
      title: show.name,
      version: show.flags.map(flag => flag.name).join(" / "),
      date: new Date(show.date),
      time: show.time,
      url: `https://www.kinoheld.de/cinema-berlin/${cinemaName}/show/${show.id}?layout=shows`,
      img: result.movies[show.movieId]?.lazyImage,
    }
  });
}

async function piffl(location, url) {
  const doc = await getDocument(url)
  return [...doc.querySelectorAll('span.lazyload')].map(span => {
    const html = span.innerHTML.slice(4, -3); // trim surounding html comment tag <!--  -->
    const d = new DOMParser().parseFromString(html, "text/html");
    const time = d.querySelector('.teaserdatum .uhrzeit') ?
          d.querySelector('.teaserdatum .uhrzeit').textContent.trim() : // fhain
          d.querySelector('.teasertag').childNodes[2].textContent.trim();
    const [day, month] = d.querySelector('.teaserdatum .datum') ?
          d.querySelector('.teaserdatum .datum').textContent.split('.') : // fhain
          d.querySelector('.teaserdatum').textContent.split('.');
    const date = new Date(`2020-${month}-${day}`);
    return {
      title: d.querySelector('.teasertitel').textContent,
      version: d.querySelector('.teasertitel_version')?.textContent, // kreuzberg
      description: d.querySelector('.teasertext').textContent,
      img: d.querySelector('img').src,
      url: d.querySelector('.minilinse a.minilink[href*="kinotickets"]').href,
      date,
      time,
      location,
    };
  });
}
