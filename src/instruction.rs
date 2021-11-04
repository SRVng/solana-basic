use solana_program::{
    program_error::ProgramError,
};

#[derive(Debug)]
pub struct Plusvar {
    pub method: u8,
    pub x: f32,
    pub y: f32,
}

impl Plusvar {
    pub fn unpack(input: &[u8]) -> Result<Self, ProgramError> {
        let (tag, rest) = input.split_at(1);
        let (first_arg, second_arg) = rest.split_at(4);
        let mut x: f32 = 0.;
        let mut y: f32 = 0.;
        
        x += Self::decode(first_arg).unwrap();
        y += Self::decode(second_arg).unwrap();
        Ok(
            Plusvar{
                method: tag[0] as u8,
                x,
                y,
            }
        ) 
    }
    fn decode(input: &[u8]) -> Result<f32, String> {
        if input.len() != 4 {
            return Err("Please check input's length".to_string())
        } else if input[3] >= 128 {
            let mut value:f32 = 0.;
            for i in 0..input.len() {
                if i == 0 { // For the first i (0) 255 is for value of -1
                    value += (256. - input[i] as f32) * (256 as i64).pow(i as u32) as f32
                } else if input[i] != 255 { // For the other i 255 is for value of 0
                    value += (255. - input[i] as f32) * (256 as i64).pow(i as u32) as f32
                } else {
                    value += 0.
                }
            }
            return Ok(value * -1.)
        } else if input[3] <= 127 {
            let mut value:f32 = 0.;
            for i in 0..input.len() {
                value += (256 as i64).pow(i as u32) as f32 * input[i] as f32;
            }
            return Ok(value)
        } else {
            return Err("Unknown Error".to_string())
        }
    }
}