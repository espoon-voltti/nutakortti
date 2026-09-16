import React from 'react'
import { Translations } from '../types'

export const translations: Translations = {
  addToHomescreen: <>Click the <i/> icon and choose ”Add to home screen” to add the app</>,
  login: {
    title: 'Nuori Espoo membership card',
    label: 'Your phone number',
    placeholder: 'Ex: 05051190912',
    submit: 'Send a new login link',
    errorMessage: 'Check that the the phone number is valid',
    authMessages: {
      authFail: 'Login failed. Enter your phone number to get a new login link',
      linkRequestSuccess: 'A new link was sent to the number you entered',
      linkRequestFail: 'Link sending failed, please try again',
    }
  },
  logout: {
    title: 'Nuori Espoo membership card application',
    heading: 'Thank you!',
    message: 'You have now logged out. Thank you for using this service!'
  },
  parentRedirect: {
    title: 'Applying for a Nuori Espoo membership card',
    ingress: 'The Nuori Espoo membership card is a free membership card for Espoo youth centres that works in a mobile device. Your child uses it to sign into a youth centre.',
    description: (
      <p>
        With this form you can apply for a membership card to the youth services of the city of Espoo for your young person.
        The card is renewed using the same form for each term.
        Log in with online banking codes, your mobile certificate, or an e-identity card and fill in the requested information.
        <br/><br/>
        When the application has been received, we will call you and send your young person a personal login link to the service
        via SMS.
      </p>
    ),
    submit: 'Fill in the application',
    privacyPolicy: {
      title: 'Privacy policy',
      href: 'https://www.espoo.fi/en/city-and-decision-making/safety/data-protection/privacy-notices-growth-and-learning-sector/privacy-notice-processing-personal-data-espoo-youth-centres-membership-register',
    }
  },
  parentRegistration: {
    logout: 'Log out',
    title: 'Nuori Espoo membership card application',
    form: {
      juniorHeading: 'Young person’s information',
      juniorFirstName: 'First names',
      juniorLastName: 'Last name',
      juniorNickName: 'Nickname',
      juniorBirthday: 'Date of birth',
      juniorBirthdayPlaceholder: 'dd.mm.yyyy',
      juniorPhoneNumber: 'Phone number',
      postCode: 'Postcode',
      school: 'Name of school',
      class: 'Class',
      juniorGender: 'Gender',
      juniorGenderOptions: {
        f: 'Girl',
        m: 'Boy',
        o: 'Other',
        '-': 'I don\'t want to specify',
      },
      photoPermission: 'Consent for photographs',
      photoPermissionDescription: 'We take photographs and videos intermittently of our activities for public communications. Pictures can be used in the publications of the youth service (e.g. in social media, web pages and brochures). Those who have turned 15 can decide whether to give consent for their images to be used.',
      photoPermissionOptions: {
        y: 'Yes',
        n: 'No',
      },

      parentHeading: 'Guardian\'s information',
      parentFirstName: 'First names',
      parentLastName: 'Last name',
      parentPhoneNumber: 'Phone number',

      youthClubHeading: 'Local youth centre',
      youthClubDefault: 'Choose youth centre',
      youthClubDescription: 'Choose the youth centre your child usually visits.',

      communicationsLanguage: 'Language of communication',
      communicationsLanguageDefault: 'Choose language',
      communicationsLanguageDescription: 'Language used for communication with the young person',

      termsOfUse: (
        <>
          I agree to&nbsp;<a target='_blank' rel="noopener noreferrer"
          href='https://www.vantaa.fi/instancedata/prime_product_julkaisu/vantaa/embeds/vantaawwwstructure/150593_Mobiilinutakortin_kayttoehdot.pdf'>the
          terms of use</a>
        </>
      ),
      submit: 'Send application',
      privacyPolicy: {
        title: 'How we handle your personal data.',
        href: 'https://www.espoo.fi/en/city-and-decision-making/safety/data-protection/privacy-notices-growth-and-learning-sector/privacy-notice-processing-personal-data-espoo-youth-centres-membership-register',
      }
    },
    errors: {
      required: 'Fill the information',
      birthdayFormat: 'Enter the date of birth in the following format dd.mm.yyyy',
      phoneNumberFormat: 'Check that the phone number you entered is correct',
      postCodeFormat: 'Check that the postcode you entered is correct',
      selectYouthClub: 'Choose a youth centre from the menu',
      selectLanguage: 'Choose a language from the menu',
      acceptTermsOfUse: 'Accept the terms to continue',
    },
    confirmation: {
      heading: 'Thank you for your application',
      message: (logoutLink, startOverLink) => (
        <p>When the young person’s membership card application has been processed, they will be sent a personal log in
          link via SMS. You can now {logoutLink('log out')} or {startOverLink('start over')} to apply for a card for
          another young person.
        </p>
      )
    },
    error: {
      message: 'Something went wrong. If the error persists, contact your nearest youth centre: https://www.espoo.fi/en/services/youth-centres',
      back: 'Back',
    }
  },
  qrPage: {
    login: 'Login',
    instruction: 'Show QR code to a reader when entering the youth centre.',
  },
  languages: {
    fi: 'Finnish',
    sv: 'Swedish',
    en: 'English'
  }
}
