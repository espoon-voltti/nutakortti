import React from 'react'
import { Translations } from '../types'

export const translations: Translations = {
  addToHomescreen: <>Klicka på ikonen <i/> och välj ”Lägg till på startskärmen” för att lägga till appen</>,
  login: {
    title: 'Nuori Espoo medlemskort',
    label: 'Ditt telefonnummer',
    placeholder: 'T.ex. 05051190912',
    submit: 'Skicka en ny inloggningslänk',
    errorMessage: 'Kontrollera att telefonnumret är giltigt',
    authMessages: {
      authFail: 'Inloggningen misslyckades. Ange ditt telefonnummer för att få en ny inloggningslänk',
      linkRequestSuccess: 'En ny länk skickades till numret du gav',
      linkRequestFail: 'Länksändningen misslyckades, försök igen',
    }
  },
  logout: {
    title: 'Nuori Espoo medlemkortansökan',
    heading: 'Tack!',
    message: 'Du har nu loggat ut. Tack för att du använde tjänsten!'
  },
  parentRedirect: {
    title: 'Ansökning om Nuori Espoo medlemkort',
    ingress: 'Nuori Espoo medlemskort är ett gratis medlemskort för Esbo ungdomslokaler som fungerar på din mobil. Din ungdom använder det för att logga in på ungdomslokalen.',
    description: (
      <p>
        Med detta formulär kan du ansöka om ett medlemskort för ungdomstjänsten i Esbo stad till din ungdom.
        Kortet förnyas med samma formulär för varje termin. Logga in med nätbankskoder,
        mobilcertifikat eller identitetskort och fyll i den begärda informationen.
        <br/><br/>
        När ansökan har kommit in ringer vi dig och skickar ungdomen en personlig inloggningslänk till tjänsten via SMS.
      </p>
    ),
    submit: 'Fyll i ansökan',
    privacyPolicy: {
      title: 'Integritetspolicy',
      href: 'https://www.espoo.fi/sv/esbo-stad/dataskydd/dataskyddsbeskrivningar-sektorn-fostran-och-larande/dataskyddsbeskrivning-behandling-av-personuppgifter-medlemsregistret-ungdomslokalerna-i-esbo',
    }
  },
  parentRegistration: {
    logout: 'Logga ut',
    title: <>Nuori Espoo medlemskort&shy;ansökan</>,
    form: {
      juniorHeading: 'Ungdomens information',
      juniorFirstName: 'Förnamn',
      juniorLastName: 'Efternamn',
      juniorNickName: 'Smeknamn',
      juniorBirthday: 'Födelsedatum',
      juniorBirthdayPlaceholder: 'dd.mm.åååå',
      juniorPhoneNumber: 'Telefonnummer',
      postCode: 'Postnummer',
      school: 'Skolnamn',
      class: 'Klass',
      juniorGender: 'Kön',
      juniorGenderOptions: {
        f: 'Flicka',
        m: 'Pojke',
        o: 'Annan',
        '-': 'Jag vill inte specificera',
      },
      photoPermission: 'Fotograferingstillstånd',
      photoPermissionDescription: 'Vi fotograferar och filmar vår verksamhet då och då för allmän kommunikation. Bilder kan användas i ungdomstjänstens publikationer (t.ex. i sociala medier, webbsidor och broschyrer). De som har fyllt 15 år kan själva bestämma om de tillåter fotografering.',
      photoPermissionOptions: {
        y: 'Ja',
        n: 'Nej',
      },

      parentHeading: 'Vårdnadshavares information',
      parentFirstName: 'Alla förnamn',
      parentLastName: 'Efternamn',
      parentPhoneNumber: 'Telefonnummer',

      youthClubHeading: 'Hemungdomslokal',
      youthClubDefault: 'Välj ungdomslokal',
      youthClubDescription: 'Välj den ungdomslokal din ungdom brukar besöka.',

      communicationsLanguage: 'Kommunikationsspråk',
      communicationsLanguageDefault: 'Välj språk',
      communicationsLanguageDescription: 'Språket som används för meddelanden som skickas till ungdomen (t.ex. SMS-meddelanden)',

      termsOfUse: (
        <>
          Jag godkänner&nbsp;<a target='_blank' rel="noopener noreferrer"
          href='https://www.vantaa.fi/instancedata/prime_product_julkaisu/vantaa/embeds/vantaawwwstructure/150593_Mobiilinutakortin_kayttoehdot.pdf'>användarvillkoren</a>
        </>
      ),
      submit: 'Skicka ansökan',
      privacyPolicy: {
        title: 'Läs hur vi hanterar dina personuppgifter.',
        href: 'https://www.espoo.fi/sv/esbo-stad/dataskydd/dataskyddsbeskrivningar-sektorn-fostran-och-larande/dataskyddsbeskrivning-behandling-av-personuppgifter-medlemsregistret-ungdomslokalerna-i-esbo',
      }
    },
    errors: {
      required: 'Fyll i informationen',
      birthdayFormat: 'Ange födelsedatum i formatet dd.mm.åååå',
      phoneNumberFormat: 'Kontrollera att telefonnumret du gav är korrekt',
      postCodeFormat: 'Kontrollera att postnumret du gav är korrekt',
      selectYouthClub: 'Välj en ungdomslokal från menyn',
      selectLanguage: 'Välj ett språk från menyn',
      acceptTermsOfUse: 'Acceptera villkoren för att fortsätta',
    },
    confirmation: {
      heading: 'Tack för ansökan',
      message: (logoutLink, startOverLink) => (
        <p>
          När ungdomens medlemskortsansökan har behandlats får han eller hon en personlig inloggningslänk via sms. Du kan
          nu {logoutLink('logga ut')} eller {startOverLink('börja om')} för att ansöka om kort för en annan ungdom.
        </p>
      )
    },
    error: {
      message: 'Något gick fel. Om felet återkommer, kontakta din närmaste ungdomslokal: https://www.espoo.fi/sv/tjanster/ungdomslokaler',
      back: 'Tillbaka',
    }
  },
  qrPage: {
    login: 'Logga in',
    instruction: 'Visa QR-kod för en läsare vid inträde i ungdomslokalen.',
  },
  languages: {
    fi: 'finska',
    sv: 'svenska',
    en: 'engelska'
  }
}
