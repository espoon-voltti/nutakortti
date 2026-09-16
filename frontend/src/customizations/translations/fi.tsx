import React from 'react'
import { Translations } from '../types'

export const translations: Translations = {
  addToHomescreen: <>Klikkaa <i/>-kuvaketta ja valitse ”Lisää Koti-valikkoon” lisätäksesi sovelluksen</>,
  login: {
    title: 'Nuori Espoo jäsenkortti',
    label: 'Puhelinnumerosi',
    placeholder: 'Ex: 05051190912',
    submit: 'Lähetä uusi kirjautumislinkki',
    errorMessage: 'Tarkista, että antamasi puhelinnumero on oikein',
    authMessages: {
      authFail: "Kirjautuminen epäonnistui. Syötä puhelinnumerosi saadaksesi uuden kirjautumislinkin",
      linkRequestSuccess: "Uusi linkki lähetettiin syöttämääsi numeroon",
      linkRequestFail: "Linkin lähetys epäonnistui, ole hyvä ja yritä uudelleen",
    }
  },
  logout: {
    title: 'Nuori Espoo jäsenkortin hakeminen',
    heading: 'Kiitos!',
    message: 'Olet nyt kirjautunut ulos. Kiitos palvelun käytöstä!'
  },
  parentRedirect: {
    title: 'Nuori Espoo jäsenkortin hakeminen',
    ingress: 'Nuori Espoo jäsenkortti on maksuton mobiililaitteella toimiva Espoon nuorisotilojen jäsenkortti, jonka avulla nuori kirjautuu sisään nuorisotilaan.',
    description: (
      <p>
        Tällä lomakkeella voit huoltajana hakea lapsellesi tai nuorellesi Espoon
        kaupungin nuorisopalveluiden jäsenkorttia. Jäsenkortti uusitaan
        toimintakausittain saman lomakkeen kautta. Kirjaudu sisään pankkitunnuksilla,
        mobiilivarmenteella tai sirullisella henkilökortilla ja täytä pyydetyt tiedot.
        <br/><br/>
        Kun hakemus on vastaanotettu, soitamme sinulle ja lähetämme nuorelle
        tekstiviestillä henkilökohtaisen kirjautumislinkin palveluun.
      </p>
    ),
    submit: 'Täytä hakemus',
    privacyPolicy: {
      title: 'Tietosuojaseloste',
      href: 'https://www.espoo.fi/fi/espoon-kaupunki/tietosuojaselosteet/kasvun-ja-oppimisen-toimialan-tietosuojaselosteet/tietosuojaseloste-henkilotietojen-kasittely-espoon-nuorisotilojen-jasenrekisteri',
    }
  },
  parentRegistration: {
    logout: 'Kirjaudu ulos',
    title: 'Nuori Espoo jäsenkortin hakemus',
    form: {
      juniorHeading: 'Nuoren tiedot',
      juniorFirstName: 'Etunimet',
      juniorLastName: 'Sukunimi',
      juniorNickName: 'Kutsumanimi',
      juniorBirthday: 'Syntymäaika',
      juniorBirthdayPlaceholder: 'pp.kk.vvvv',
      juniorPhoneNumber: 'Puhelinnumero',
      postCode: 'Postinumero',
      school: 'Koulun nimi',
      class: 'Luokka',
      juniorGender: 'Sukupuoli',
      juniorGenderOptions: {
        f: 'Tyttö',
        m: 'Poika',
        o: 'Muu',
        '-': 'En halua määritellä',
      },
      photoPermission: 'Kuvauslupa',
      photoPermissionDescription: 'Valokuvaamme ja videoimme ajoittain toimintaamme ja nuorta viestintää varten. Kuvia käytetään Espoon nuorisopalveluiden julkaisuissa (esim. sosiaalisessa mediassa, verkkosivuilla ja esitteissä). 15 vuotta täyttänyt saa itse päättää kuvausluvan antamisesta.',
      photoPermissionOptions: {
        y: 'Kyllä',
        n: 'Ei',
      },

      parentHeading: 'Huoltajan tiedot',
      parentFirstName: 'Etunimet',
      parentLastName: 'Sukunimi',
      parentPhoneNumber: 'Puhelinnumero',

      youthClubHeading: 'Kotinuorisotila',
      youthClubDefault: 'Valitse nuorisotila',
      youthClubDescription: 'Valitse nuorisotila, jossa lapsesi tai nuoresi yleensä käy.',

      communicationsLanguage: 'Kommunikaatiokieli',
      communicationsLanguageDefault: 'Valitse kieli',
      communicationsLanguageDescription: 'Kieli, jota järjestelmä käyttää viestinnässä nuoren kanssa (esim. tekstiviestit)',

      termsOfUse: (
        <>
          Hyväksyn&nbsp;<a target='_blank' rel="noopener noreferrer"
          href='https://www.vantaa.fi/instancedata/prime_product_julkaisu/vantaa/embeds/vantaawwwstructure/150593_Mobiilinutakortin_kayttoehdot.pdf'>käyttöehdot</a>
        </>
      ),
      submit: 'Lähetä hakemus',
      privacyPolicy: {
        title: 'Lue tarkemmin, kuinka käsittelemme tietojasi.',
        href: 'https://www.espoo.fi/fi/espoon-kaupunki/tietosuojaselosteet/kasvun-ja-oppimisen-toimialan-tietosuojaselosteet/tietosuojaseloste-henkilotietojen-kasittely-espoon-nuorisotilojen-jasenrekisteri',
      }
    },
    errors: {
      required: 'Täytä tiedot',
      birthdayFormat: 'Anna syntymäaika muodossa pp.kk.vvvv',
      phoneNumberFormat: 'Tarkista, että antamasi puhelinnumero on oikein',
      postCodeFormat: 'Tarkista, että antamasi postinumero on oikein',
      selectYouthClub: 'Valitse kotinuorisotila valikosta',
      selectLanguage: 'Valitse kieli valikosta',
      acceptTermsOfUse: 'Hyväksy käyttöehdot jatkaaksesi',
    },
    confirmation: {
      heading: 'Kiitos hakemuksestasi!',
      message: (logoutLink, startOverLink) => (
        <p>Kun nuoren jäsenkorttihakemus on käsitelty, hänelle lähetetään tekstiviestillä henkilökohtainen
          kirjautumislinkki palveluun. Voit
          nyt{' '}{logoutLink('kirjautua ulos')} tai{' '}{startOverLink('aloittaa alusta')} rekisteröidäksesi jäsenkortin
          toiselle lapselle.
        </p>
      )
    },
    error: {
      message: 'Jokin meni pieleen. Jos virhe toistuu useasti, ole yhteydessä lähinuorisotilaasi: https://www.espoo.fi/fi/palvelut/nuorisotilat',
      back: 'Takaisin',
    }
  },
  qrPage: {
    login: 'Kirjaudu',
    instruction: 'Näytä QR-koodi lukulaitteelle saapuessasi nuorisotilaan.',
  },
  languages: {
    fi: 'suomi',
    sv: 'ruotsi',
    en: 'englanti'
  }
}
