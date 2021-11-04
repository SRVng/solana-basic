use borsh::{ BorshDeserialize, BorshSerialize};
use solana_program::{
    entrypoint::ProgramResult,
    account_info::{AccountInfo, next_account_info},
    pubkey::Pubkey,
    program_error::ProgramError,
    msg,
    borsh::try_from_slice_unchecked,
};
use crate::instruction::Plusvar;

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct PlusResult {
    pub result: String,
}

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    msg!("Starting...");
    let accounts_info_iter = &mut accounts.iter();
    let account = next_account_info(accounts_info_iter)?;
    
    if account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId)
    }
    msg!("Instruction data from client => {:?}",instruction_data);
    let instruction = Plusvar::unpack(instruction_data)?;

    let mut plus_account = try_from_slice_unchecked::<PlusResult>(&account.data.borrow())?;
    match instruction.method {
        0 => {
            plus_account.result = (instruction.x + instruction.y).to_string();
            msg!("Result of {} + {} is {}", instruction.x, instruction.y, plus_account.result);
        },
        1 => {
            plus_account.result = {instruction.x - instruction.y}.to_string();
            msg!("Result of {} - {} is {}", instruction.x, instruction.y, plus_account.result);
        },
        2 => {
            plus_account.result = {instruction.x * instruction.y}.to_string();
            msg!("Result of {} * {} is {}", instruction.x, instruction.y, plus_account.result);
        },
        3 => {
            plus_account.result = {instruction.x / instruction.y}.to_string();
            msg!("Result of {} / {} is {}", instruction.x, instruction.y, plus_account.result);
        },
        _ => {
            msg!("Wrong method");
        },
    }
    plus_account.result = rounded(plus_account.result)?;
    msg!("Initial account data => {:?}", account.data.borrow_mut());
    msg!("{:?}",plus_account.serialize(&mut &mut account.data.borrow_mut()[0..])); 
    plus_account.serialize(&mut &mut account.data.borrow_mut()[0..])?; 
    msg!("Account data packed => {:?}", account.data.borrow_mut());
    
    Ok(())
}

pub fn rounded(input: String) -> Result<String, ProgramError> {
    let mut split = input.split('.');

    let num = split.next();
    let decimals = split.next();

    let mut result = num.unwrap().to_string();

    if decimals == None {
        return Ok(result)
    }
    
    let mut rounded = decimals.unwrap().chars();
    let rounded_count = rounded.clone().count();
    result.push('.');

    match rounded_count {
        x if x < 3 => {
            for _ in 0..x {
                result.push(rounded.next().unwrap())
            }
        },
        x if x >= 3 => {
            for _ in 0..3 {
                result.push(rounded.next().unwrap())
            }
        },
        _ => ()
    }

    Ok(result)
}