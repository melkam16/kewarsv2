const secondsInADay = 24 * 3600;
const months = ['መስከረም', 'ጥቅምት', 'ኅዳር', 'ታኅሣሥ', 'ጥር', 'የካቲት', 'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜን'];
const daysOfTheWeek = ['ሰኞ', 'ማክሰኞ', 'ረቡዕ', 'ኀሙስ', 'ዓርብ', 'ቅዳሜ', 'እሑድ'];
const epochMonth = 3; // zero based index
const epochDay = 23;
const epochYear = 1962;
const epochHour = 3;
const utcOffset = 3;



export class EthDateTime {
  constructor ({year, 
    month, 
    day, 
    isNight,
    hour = 0, 
    minute = 0, 
    second = 0, 
  }) {
    this.year = year;
    this.month = month;
    this.day = day;
    this.hour = hour;
    this.minute = minute;
    this.second = second;
    this.isNight = isNight;
  };

  toString = () => {
    return `${months[this.month]} ${this.day}፣ ${this.year} ${this.hour.toString().padStart(2,'0')}:${this.minute.toString().padStart(2,'0')}:${this.second.toString().padStart(2,'0')} ${this.isNight? '🌑' : '☀️'}`;
  }

  toDateString = () => {
    return `${months[this.month]} ${this.day}፣ ${this.year}`;
  }
}


export class EthDateTimeConverter {
  static isALeapYear(year) {
    return year % 4 == 3; // zemene lukas
  }

  static yearStartDayIndex(year) {
    const totalYears = 5500 + year;
    return (totalYears + Math.floor(totalYears / 4)) % 7;
  }

  static getEthiopianDateTimeFromSeconds(secondsSinceEpoch) {
    let daysSinceEpoch = Math.floor(secondsSinceEpoch / secondsInADay);
    let remainingSeconds = (secondsSinceEpoch % secondsInADay);
    let yearsSinceEpoch = Math.floor(daysSinceEpoch / 365);
    let remainingDays = daysSinceEpoch % 365;
    let currentYear = epochYear + yearsSinceEpoch;
    let leapYears = Math.floor(currentYear/4) - Math.floor(epochYear/4);

    // Take away some days for leap years
    let adjustedDays = remainingDays - leapYears;
  
    let currentMonth = 0;
    let currentDay = 0;
    let dayOfWeek = 0;
    let hours = Math.floor(remainingSeconds / 3600 );
    let minutes = Math.floor((remainingSeconds % 3600) / 60);
    let seconds = ((remainingSeconds % 3600) % 60);           

    if (adjustedDays > 247) { // pagumen 1 and beyond
      let daysOfPagumen = EthDateTimeConverter.isALeapYear(currentYear) ? 6 : 5;
      dayOfWeek = (EthDateTimeConverter.yearStartDayIndex(currentYear) + adjustedDays - 1) % 7;
      adjustedDays = adjustedDays - 247;  // reset to Pagumen 1st      

      if (adjustedDays > daysOfPagumen) { // we are going into the next year
        adjustedDays = adjustedDays - daysOfPagumen; // reset to meskerem 1

        currentYear = currentYear + 1;
        currentMonth = Math.floor(adjustedDays / 30); //zero based index        
        currentDay = (adjustedDays % 30);

        if (currentDay === 0) {
          currentDay = 30;
          currentMonth = currentMonth - 1;
        }

        hours = hours + utcOffset;
        if (hours >= 24) {
          currentDay = currentDay + 1; 
          
          if ( currentDay > 30 ) {
            currentDay = currentDay % 30;  // we went into next month
            currentMonth = currentMonth + 1; // this will stay in current year
          }

          dayOfWeek = (dayOfWeek + 1)%7;
          hours = hours % 24;
        }
      } else { // in the month of pagumen
        currentMonth = 12; // zero based index
        currentDay = adjustedDays;

        hours = hours + utcOffset;
        if (hours >= 24) {
          currentDay = currentDay + 1; 
          
          if ( currentDay > daysOfPagumen ) {
            currentDay = currentDay % daysOfPagumen;  // we went into next year
            currentMonth = 0;
            currentYear = currentYear + 1;
          }

          dayOfWeek = (dayOfWeek + 1)%7;
          hours = hours % 24;
        }        
      }   
    } else {
      currentMonth = epochMonth + Math.floor(adjustedDays / 30) + 1; //zero based index
      dayOfWeek = (EthDateTimeConverter.yearStartDayIndex(currentYear) + adjustedDays + epochDay) % 7;
      currentDay = (adjustedDays % 30);
      
      if ( currentDay === 0) {
        currentDay = epochDay;
        currentMonth = currentMonth - 1;
      } else {
        currentDay = currentDay - ( 30 - epochDay);
        if (currentDay < 1) {
          currentDay = 30 + currentDay;
          currentMonth = currentMonth - 1;
        }
      }

      if (hours + utcOffset >= 24) {
        currentDay = currentDay + 1; 
        
        if ( currentDay > 30 ) {
          currentDay = currentDay % 30;  // we went into next month
          currentMonth = currentMonth + 1; // we won't go into next year
        }

        dayOfWeek = (dayOfWeek + 1)%7;
        hours = hours + utcOffset - 24;
      } else {
        hours = hours + utcOffset;
      }
    }

    let ethiopianHour = (hours + 6) % 12;
    //console.log(secondsSinceEpoch, currentDay);
    return new EthDateTime({
      year: currentYear,
      month: currentMonth,
      day: currentDay,
      hour: ethiopianHour == 0 ? 12 : ethiopianHour, 
      minute: minutes,
      second: seconds,
      isNight: hours < 6 || hours >= 18, 
    });   
  }

  static getEthiopianDateTimeFromMillis(millisSinceEpoch) {
    return EthDateTimeConverter.getEthiopianDateTimeFromSeconds(Math.floor(millisSinceEpoch/1000));
  }

  static getEpochMillisFromEthDateTime(ethDateTime) {
    return EthDateTimeConverter.getEpochSecondsFromEthDateTime(ethDateTime) * 1000;
  }

  static getEpochSecondsFromEthDateTime(ethDateTime) {
    // convert ethiopian hour to 24 hours
    let hour;
    if (ethDateTime.isNight) {
      hour = (ethDateTime.hour == 12) ? 18 : (ethDateTime.hour + 18)%24;      
    } else {
      hour = (ethDateTime.hour == 12) ? 6 : (ethDateTime.hour + 6);
    }

    let epochDaysSinceStartOfEpochYear = (epochDay - 1  + (epochMonth) * 30);
    let daysSinceYearBeginning = (ethDateTime.day - 1) + ethDateTime.month * 30;
    let leapDaysSinceEpoch = Math.floor(ethDateTime.year/4) - Math.floor(epochYear/4);
    let daysSinceEpoch = ((ethDateTime.year - epochYear) * 365) + leapDaysSinceEpoch;

    return ethDateTime.second + ethDateTime.minute * 60 + (hour - epochHour) * 3600 + ( daysSinceEpoch + daysSinceYearBeginning - epochDaysSinceStartOfEpochYear) * secondsInADay;     
  }
}
